import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async findAll(status?: string) {
    return this.prisma.client.findMany({
      where: status ? { status: status as any } : {},
      include: { projects: { select: { id: true, uuid: true, name: true, status: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByUuid(uuid: string) {
    const client = await this.prisma.client.findUnique({
      where: { uuid },
      include: { projects: true },
    });
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  async findByWhatsApp(whatsappNumber: string) {
    return this.prisma.client.findFirst({
      where: { whatsappNumber, status: 'active' },
      include: {
        projects: {
          where: { status: { in: ['ready', 'indexing'] } },
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  async create(data: { name: string; company?: string; email?: string; whatsappNumber: string }) {
    return this.prisma.client.create({
      data: {
        uuid: crypto.randomUUID(),
        name: data.name,
        company: data.company,
        email: data.email,
        whatsappNumber: data.whatsappNumber,
      },
    });
  }

  async update(uuid: string, data: any) {
    await this.findByUuid(uuid);
    return this.prisma.client.update({ where: { uuid }, data });
  }

  async remove(uuid: string) {
    await this.findByUuid(uuid);
    return this.prisma.client.delete({ where: { uuid } });
  }
}
