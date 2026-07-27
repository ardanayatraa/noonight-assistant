import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ClientsService } from '../clients/clients.service';
import { WorkspaceService } from '../workspace/workspace.service';
import { AiService } from '../ai/ai.service';
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
  ) {}

  async handleWhatsAppMessage(from: string, body: string): Promise<string> {
    try {
      // 1. Lookup client by WhatsApp number
      const client = await this.clientsService.findByWhatsApp(from);
      if (!client) {
        return 'Nomor Anda belum terdaftar. Silakan hubungi admin untuk didaftarkan.';
      }

      // 2. Get the active project
      const project = client.projects[0];
      if (!project) {
        return 'Belum ada project yang terhubung ke akun Anda.';
      }

      if (project.status === 'cloning') {
        return 'Project Anda sedang disiapkan. Silakan coba lagi dalam beberapa menit.';
      }

      if (project.status === 'error') {
        return 'Project Anda mengalami kendala saat cloning. Admin sedang mengecek.';
      }

      // 3. Handle slash commands
      if (body.startsWith('/project')) {
        return this.handleProjectSwitch(client, body);
      }

      // 4. Find or create session
      const session = await this.findOrCreateSession(project.id, from, 'whatsapp');

      // 5. Get AI context
      const structure = await this.getProjectMemory(project.id, 'project_structure');
      const codeResults = this.workspaceService.searchCode(
        project.workspacePath || '',
        body,
      );

      // 6. Get conversation history
      const history = await this.getRecentHistory(session.id);

      // 7. Get AI provider config
      const aiConfig = await this.getAiConfig(project);

      // 8. Send to AI
      const answer = await this.aiService.answerProjectQuery(aiConfig, body, {
        projectName: project.name,
        framework: project.framework || 'Unknown',
        structure: structure || '',
        codeResults,
        memory: '',
        history,
      });

      // 9. Save conversation
      await this.saveMessage(session.id, project.id, 'user', body);
      await this.saveMessage(session.id, project.id, 'assistant', answer);

      // 10. Update session
      await this.prisma.session.update({
        where: { id: session.id },
        data: {
          lastActivityAt: new Date(),
          totalTokens: { increment: Math.ceil((body.length + answer.length) / 4) },
        },
      });

      return answer;
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

    return (conversation?.messages || []).map(m => ({
      role: m.role,
      content: m.content,
    }));
  }

  private async saveMessage(sessionId: bigint, projectId: bigint, role: string, content: string) {
    // Find or create conversation for this session
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

  private async getAiConfig(project: any): Promise<AiProviderConfig> {
    const defaultProvider = await this.prisma.aiProvider.findFirst({
      where: { isDefault: true, isActive: true },
    });

    if (defaultProvider) {
      return {
        type: defaultProvider.provider as AiProviderType,
        apiKey: defaultProvider.apiKey,
        model: project.aiModelOverride || defaultProvider.model,
        baseUrl: defaultProvider.baseUrl || undefined,
      };
    }

    return {
      type: 'deepseek' as AiProviderType,
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      model: 'deepseek-chat',
      baseUrl: 'https://api.deepseek.com/v1',
    };
  }

  private async handleProjectSwitch(client: any, body: string): Promise<string> {
    const parts = body.split(' ');
    if (parts.length < 2) {
      const projectNames = client.projects?.map((p: any) => `- ${p.name}`).join('\n') || 'Tidak ada project';
      return `Project Anda:\n${projectNames}\n\nKetik /project <nama> untuk berpindah.`;
    }

    const targetName = parts.slice(1).join(' ');
    const target = client.projects?.find(
      (p: any) => p.name.toLowerCase() === targetName.toLowerCase(),
    );

    if (!target) {
      return `Project "${targetName}" tidak ditemukan.`;
    }

    return `Berpindah ke project: ${target.name}`;
  }
}
