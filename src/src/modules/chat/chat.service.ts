import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ClientsService } from '../clients/clients.service';
import { WorkspaceService } from '../workspace/workspace.service';
import { AiService } from '../ai/ai.service';
import { AgentsService } from '../agents/agents.service';
import { MemoryService } from '../memory/memory.service';
import { AiProviderConfig, AiProviderType } from '../ai/providers/ai-provider.interface';
import * as crypto from 'crypto';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private prisma: PrismaService,
    private clientsService: ClientsService,
    private workspaceService: WorkspaceService,
    private aiService: AiService,
    private agentsService: AgentsService,
    private memoryService: MemoryService,
  ) {}

  async handleWhatsAppMessage(from: string, body: string): Promise<string> {
    try {
      // 1. Lookup client (with agent, all ready repos, and resolved active repo)
      const client = await this.clientsService.findByWhatsApp(from);
      if (!client) {
        return 'Nomor Anda belum terdaftar. Silakan hubungi admin untuk didaftarkan.';
      }

      // 2. Handle slash commands before requiring a ready project
      if (body.trim().startsWith('/project')) {
        return this.handleProjectSwitch(client, body);
      }

      // 3. Resolve the active repo for this user
      const project = client.activeProject;
      if (!project) {
        return 'Belum ada project yang siap di akun Anda. Ketik /project untuk melihat daftar.';
      }
      if (project.status === 'cloning') {
        return 'Project Anda sedang disiapkan. Silakan coba lagi dalam beberapa menit.';
      }
      if (project.status === 'error') {
        return 'Project Anda mengalami kendala saat cloning. Admin sedang mengecek.';
      }

      // 4. Prepaid quota: each real question costs 1 request
      if ((client.requestBalance ?? 0) <= 0) {
        return (
          '⚠️ Saldo request Anda habis (0 tersisa).\n' +
          'Silakan hubungi admin untuk menambah saldo agar bisa bertanya lagi tentang project Anda.'
        );
      }

      // 5. Per-user agent (persona + provider/model)
      const agent = client.agent ?? (await this.agentsService.ensureForClient(client.id));

      // 6. Session + AI context
      const session = await this.findOrCreateSession(project.id, from, 'whatsapp');
      const structure = await this.getProjectMemory(project.id, 'project_structure');
      const overview = this.workspaceService.getProjectOverview(project.workspacePath || '');
      const codeResults = this.workspaceService.searchCode(project.workspacePath || '', body);
      const memory = await this.memoryService.buildContext(client.id, project.id);
      const history = await this.getRecentHistory(session.id);
      const aiConfig = await this.getAiConfig(project, agent);

      // 7. Ask the agent
      const answer = await this.aiService.answerProjectQuery(aiConfig, body, {
        agentName: agent?.name || 'Hermes',
        persona: agent?.persona || '',
        projectName: project.name,
        framework: project.framework || 'Unknown',
        structure: structure || '',
        overview,
        codeResults,
        memory,
        history,
      });

      // 8. Persist conversation + session usage
      await this.saveMessage(session.id, project.id, 'user', body);
      await this.saveMessage(session.id, project.id, 'assistant', answer);
      await this.prisma.session.update({
        where: { id: session.id },
        data: {
          lastActivityAt: new Date(),
          totalTokens: { increment: Math.ceil((body.length + answer.length) / 4) },
        },
      });

      // 9. Charge 1 request and report the remaining balance
      const updated = await this.prisma.client.update({
        where: { id: client.id },
        data: { requestBalance: { decrement: 1 }, requestsUsed: { increment: 1 } },
        select: { requestBalance: true },
      });
      const remaining = updated.requestBalance;
      const footer =
        remaining <= 0
          ? '\n\n— Ini pertanyaan terakhir Anda. Saldo habis, hubungi admin untuk top-up.'
          : remaining <= 5
            ? `\n\n— Sisa saldo: ${remaining} request (menipis)`
            : `\n\n— Sisa saldo: ${remaining} request`;

      return answer + footer;
    } catch (err: any) {
      this.logger.error(`Chat error: ${err.message}`);
      return 'Maaf, terjadi kesalahan. Silakan coba lagi nanti.';
    }
  }

  private async findOrCreateSession(projectId: bigint, identifier: string, platform: string) {
    let session = await this.prisma.session.findFirst({
      where: { projectId, identifier, status: 'active', platform: platform as any },
      orderBy: { createdAt: 'desc' },
    });

    if (!session) {
      const project = await this.prisma.project.findUnique({ where: { id: projectId } });
      const timeoutMinutes = project?.sessionTimeoutMinutes || 30;
      session = await this.prisma.session.create({
        data: {
          uuid: crypto.randomUUID(),
          projectId: Number(projectId),
          platform: platform as any,
          identifier,
          expiresAt: new Date(Date.now() + timeoutMinutes * 60000),
          lastActivityAt: new Date(),
        },
      });
    }

    return session;
  }

  private async getProjectMemory(projectId: bigint, key: string): Promise<string | null> {
    const mem = await this.prisma.aiMemory.findUnique({
      where: { projectId_key: { projectId, key } },
    });
    return mem?.value || null;
  }

  private async getRecentHistory(sessionId: bigint): Promise<{ role: string; content: string }[]> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      include: {
        messages: { orderBy: { createdAt: 'asc' }, take: 20 },
      },
    });

    return (conversation?.messages || []).map((m) => ({
      role: m.role,
      content: m.content,
    }));
  }

  private async saveMessage(sessionId: bigint, projectId: bigint, role: string, content: string) {
    let conversation = await this.prisma.conversation.findFirst({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          sessionId,
          projectId,
          title: content.slice(0, 100),
        },
      });
    }

    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: role as any,
        content,
        tokenCount: Math.ceil(content.length / 4),
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        messageCount: { increment: 1 },
        totalTokens: { increment: Math.ceil(content.length / 4) },
      },
    });
  }

  /**
   * Resolve provider config: agent override → default provider row → env.
   * The agent may swap only the model, or the whole provider (if a matching
   * active AiProvider row exists to supply the API key).
   */
  private async getAiConfig(project: any, agent: any): Promise<AiProviderConfig> {
    const temperature = agent?.temperature ?? 0.3;

    // Whole-provider override via the agent
    if (agent?.provider) {
      const row = await this.prisma.aiProvider.findFirst({
        where: { provider: agent.provider, isActive: true },
      });
      if (row) {
        return {
          type: row.provider as AiProviderType,
          apiKey: row.apiKey,
          model: agent.model || row.model,
          baseUrl: row.baseUrl || undefined,
          temperature,
        };
      }
    }

    const defaultProvider = await this.prisma.aiProvider.findFirst({
      where: { isDefault: true, isActive: true },
    });

    if (defaultProvider) {
      return {
        type: defaultProvider.provider as AiProviderType,
        apiKey: defaultProvider.apiKey,
        model: agent?.model || project.aiModelOverride || defaultProvider.model,
        baseUrl: defaultProvider.baseUrl || undefined,
        temperature,
      };
    }

    return {
      type: 'deepseek' as AiProviderType,
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      model: agent?.model || 'deepseek-chat',
      baseUrl: 'https://api.deepseek.com/v1',
      temperature,
    };
  }

  private async handleProjectSwitch(client: any, body: string): Promise<string> {
    const projects: any[] = client.projects || [];
    const parts = body.trim().split(/\s+/);

    if (parts.length < 2) {
      if (!projects.length) return 'Belum ada project yang siap di akun Anda.';
      const list = projects
        .map((p) => `${p.id === client.activeProjectId ? '▶︎' : '•'} ${p.name}`)
        .join('\n');
      return `Repositori Anda:\n${list}\n\nKetik /project <nama> untuk berpindah.`;
    }

    const targetName = parts.slice(1).join(' ');
    const target = projects.find((p) => p.name.toLowerCase() === targetName.toLowerCase());
    if (!target) {
      return `Project "${targetName}" tidak ditemukan.`;
    }

    await this.clientsService.setActiveProject(client.uuid, target.uuid);
    return `✅ Berpindah ke project: ${target.name}`;
  }
}
