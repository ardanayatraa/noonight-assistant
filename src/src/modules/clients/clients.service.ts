import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AgentsService } from '../agents/agents.service';
import * as crypto from 'crypto';

@Injectable()
export class ClientsService {
  constructor(
    private prisma: PrismaService,
    private agents: AgentsService,
  ) {}

  async findAll(status?: string) {
    return this.prisma.client.findMany({
      where: status ? { status: status as any } : {},
      include: {
        projects: {
          select: {
            id: true, uuid: true, name: true, status: true, statusDetail: true,
            repoUrl: true, framework: true, lastSyncedAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        agent: { select: { uuid: true, name: true, provider: true, model: true, isActive: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByUuid(uuid: string) {
    const client = await this.prisma.client.findUnique({
      where: { uuid },
      include: { projects: true, agent: true },
    });
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  /**
   * Resolve the client for an incoming WhatsApp message, returning ALL ready
   * repos, the resolved active repo, and the per-user agent. Kept to a single
   * round-trip for efficiency.
   */
  async findByWhatsApp(whatsappNumber: string) {
    const client = await this.prisma.client.findFirst({
      where: { whatsappNumber, status: 'active' },
      include: {
        agent: true,
        projects: {
          where: { status: { in: ['ready', 'indexing'] } },
          orderBy: { updatedAt: 'desc' },
        },
      },
    });
    if (!client) return null;

    // Resolve the active repo: honour activeProjectId if it still points at a
    // ready repo, otherwise fall back to the most recently updated one.
    const active =
      client.projects.find((p) => p.id === client.activeProjectId) ?? client.projects[0] ?? null;

    return { ...client, activeProject: active };
  }

  async create(data: { name: string; company?: string; email?: string; whatsappNumber: string }) {
    const existing = await this.prisma.client.findUnique({
      where: { whatsappNumber: data.whatsappNumber },
    });
    if (existing) {
      throw new BadRequestException('A user with this WhatsApp number already exists');
    }

    const client = await this.prisma.client.create({
      data: {
        uuid: crypto.randomUUID(),
        name: data.name,
        company: data.company,
        email: data.email,
        whatsappNumber: data.whatsappNumber,
      },
    });

    // Every user gets their own Hermes agent immediately.
    await this.agents.ensureForClient(client.id, `Hermes · ${client.name}`);

    return this.findByUuid(client.uuid);
  }

  async update(uuid: string, data: any) {
    await this.findByUuid(uuid);
    return this.prisma.client.update({ where: { uuid }, data });
  }

  async remove(uuid: string) {
    await this.findByUuid(uuid);
    return this.prisma.client.delete({ where: { uuid } });
  }

  /** Admin tops up (or corrects) a user's prepaid request balance. */
  async adjustBalance(clientUuid: string, amount: number) {
    const delta = Math.trunc(Number(amount));
    if (!Number.isFinite(delta) || delta === 0) {
      throw new BadRequestException('Amount must be a non-zero whole number');
    }
    const client = await this.prisma.client.findUnique({ where: { uuid: clientUuid } });
    if (!client) throw new NotFoundException('Client not found');

    const newBalance = Math.max(0, client.requestBalance + delta);
    const updated = await this.prisma.client.update({
      where: { id: client.id },
      data: { requestBalance: newBalance },
      select: { uuid: true, requestBalance: true, requestsUsed: true },
    });
    return updated;
  }

  /** Switch which repo the user is currently talking to (enforces ownership). */
  async setActiveProject(clientUuid: string, projectUuid: string) {
    const client = await this.prisma.client.findUnique({
      where: { uuid: clientUuid },
      include: { projects: true },
    });
    if (!client) throw new NotFoundException('Client not found');

    const project = client.projects.find((p) => p.uuid === projectUuid);
    if (!project) {
      throw new BadRequestException('That repository does not belong to this user');
    }

    await this.prisma.client.update({
      where: { id: client.id },
      data: { activeProjectId: project.id },
    });
    return { activeProjectUuid: projectUuid, name: project.name };
  }
}
