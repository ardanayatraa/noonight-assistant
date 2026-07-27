import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async findAll(clientUuid?: string) {
    const where: any = {};
    if (clientUuid) {
      const client = await this.prisma.client.findUnique({ where: { uuid: clientUuid } });
      if (!client) throw new NotFoundException('Client not found');
      where.clientId = client.id;
    }
    return this.prisma.project.findMany({
      where,
      include: { client: { select: { uuid: true, name: true, whatsappNumber: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByUuid(uuid: string) {
    const project = await this.prisma.project.findUnique({
      where: { uuid },
      include: { client: true },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async create(data: {
    clientUuid: string;
    name: string;
    repoUrl: string;
    branch?: string;
    githubToken?: string;
  }) {
    const client = await this.prisma.client.findUnique({ where: { uuid: data.clientUuid } });
    if (!client) throw new NotFoundException('Client not found');

    const project = await this.prisma.project.create({
      data: {
        uuid: crypto.randomUUID(),
        clientId: client.id,
        name: data.name,
        repoUrl: data.repoUrl,
        branch: data.branch || 'main',
        githubTokenEncrypted: data.githubToken,
        workspacePath: `/workspaces/${client.uuid}/${crypto.randomUUID()}`,
        status: 'cloning',
      },
    });

    // Emit event for async clone + index
    this.eventEmitter.emit('project.created', project);

    return project;
  }

  async update(uuid: string, data: any) {
    await this.findByUuid(uuid);
    return this.prisma.project.update({ where: { uuid }, data });
  }

  async remove(uuid: string) {
    await this.findByUuid(uuid);
    return this.prisma.project.delete({ where: { uuid } });
  }

  async sync(uuid: string) {
    const project = await this.findByUuid(uuid);
    this.eventEmitter.emit('project.sync', project);
    return { message: 'Sync started', projectUuid: uuid };
  }

  async getStatus(uuid: string) {
    const project = await this.findByUuid(uuid);
    return {
      uuid: project.uuid,
      name: project.name,
      status: project.status,
      framework: project.framework,
      lastSyncedAt: project.lastSyncedAt,
    };
  }
}
