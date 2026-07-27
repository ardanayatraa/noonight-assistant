import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

type MemoryType = 'preference' | 'knowledge' | 'context' | 'system';

@Injectable()
export class MemoryService {
  constructor(private prisma: PrismaService) {}

  // ---- Per-user memory (shared across all of a client's repos) ----

  async listClient(clientUuid: string) {
    const client = await this.prisma.client.findUnique({ where: { uuid: clientUuid } });
    if (!client) throw new NotFoundException('Client not found');
    return this.prisma.clientMemory.findMany({
      where: { clientId: client.id },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async upsertClient(clientUuid: string, key: string, value: string, type: MemoryType = 'knowledge') {
    const client = await this.prisma.client.findUnique({ where: { uuid: clientUuid } });
    if (!client) throw new NotFoundException('Client not found');
    return this.prisma.clientMemory.upsert({
      where: { clientId_key: { clientId: client.id, key } },
      update: { value, type: type as any },
      create: { clientId: client.id, key, value, type: type as any },
    });
  }

  async deleteClient(clientUuid: string, key: string) {
    const client = await this.prisma.client.findUnique({ where: { uuid: clientUuid } });
    if (!client) throw new NotFoundException('Client not found');
    await this.prisma.clientMemory.deleteMany({ where: { clientId: client.id, key } });
    return { deleted: true };
  }

  // ---- Per-project memory (repo context) ----

  async listProject(projectUuid: string) {
    const project = await this.prisma.project.findUnique({ where: { uuid: projectUuid } });
    if (!project) throw new NotFoundException('Project not found');
    return this.prisma.aiMemory.findMany({
      where: { projectId: project.id },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async upsertProject(projectUuid: string, key: string, value: string, type: MemoryType = 'knowledge') {
    const project = await this.prisma.project.findUnique({ where: { uuid: projectUuid } });
    if (!project) throw new NotFoundException('Project not found');
    return this.prisma.aiMemory.upsert({
      where: { projectId_key: { projectId: project.id, key } },
      update: { value, type: type as any },
      create: { projectId: project.id, key, value, type: type as any },
    });
  }

  async deleteProject(projectUuid: string, key: string) {
    const project = await this.prisma.project.findUnique({ where: { uuid: projectUuid } });
    if (!project) throw new NotFoundException('Project not found');
    await this.prisma.aiMemory.deleteMany({ where: { projectId: project.id, key } });
    return { deleted: true };
  }

  /**
   * Build the memory block injected into the agent prompt: the user's own
   * memory merged with the active project's memory (structure excluded — it is
   * passed separately as the structure context).
   */
  async buildContext(clientId: bigint, projectId: bigint): Promise<string> {
    const [clientMem, projectMem] = await Promise.all([
      this.prisma.clientMemory.findMany({ where: { clientId } }),
      this.prisma.aiMemory.findMany({
        where: { projectId, key: { not: 'project_structure' } },
      }),
    ]);

    const parts: string[] = [];
    if (clientMem.length) {
      parts.push('USER MEMORY:');
      for (const m of clientMem) parts.push(`- [${m.type}] ${m.key}: ${m.value}`);
    }
    if (projectMem.length) {
      parts.push('PROJECT MEMORY:');
      for (const m of projectMem) parts.push(`- [${m.type}] ${m.key}: ${m.value}`);
    }
    return parts.join('\n');
  }
}
