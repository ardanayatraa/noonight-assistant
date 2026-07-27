import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import * as crypto from 'crypto';

const DEFAULT_PERSONA = `You are Hermes, a focused developer assistant dedicated to this user.
- Be concise, precise, and cite exact file paths.
- Only answer from the user's own repositories; never reveal or reference other users' code.`;

@Injectable()
export class AgentsService {
  constructor(private prisma: PrismaService) {}

  /** One agent per client; created on demand so every user always has a Hermes. */
  async ensureForClient(clientId: bigint, name = 'Hermes') {
    const existing = await this.prisma.agent.findUnique({ where: { clientId } });
    if (existing) return existing;
    return this.prisma.agent.create({
      data: {
        uuid: crypto.randomUUID(),
        clientId,
        name,
        persona: DEFAULT_PERSONA,
      },
    });
  }

  async getByClientUuid(clientUuid: string) {
    const client = await this.prisma.client.findUnique({ where: { uuid: clientUuid } });
    if (!client) throw new NotFoundException('Client not found');
    return this.ensureForClient(client.id);
  }

  async updateByClientUuid(
    clientUuid: string,
    data: {
      name?: string;
      persona?: string;
      provider?: string | null;
      model?: string | null;
      temperature?: number;
      isActive?: boolean;
    },
  ) {
    const agent = await this.getByClientUuid(clientUuid);
    return this.prisma.agent.update({
      where: { id: agent.id },
      data: {
        name: data.name,
        persona: data.persona,
        provider: data.provider,
        model: data.model,
        temperature: data.temperature,
        isActive: data.isActive,
      },
    });
  }
}
