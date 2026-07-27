import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getAll() {
    const settings = await this.prisma.setting.findMany();
    return settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});
  }

  async set(key: string, value: string, category?: string) {
    return this.prisma.setting.upsert({
      where: { key },
      update: { value, category },
      create: { key, value, category },
    });
  }

  async getAiProviders() {
    return this.prisma.aiProvider.findMany();
  }

  async upsertAiProvider(data: {
    name: string;
    provider: string;
    model: string;
    apiKey: string;
    baseUrl?: string;
    isDefault?: boolean;
  }) {
    if (data.isDefault) {
      await this.prisma.aiProvider.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.aiProvider.upsert({
      where: { name: data.name },
      update: data,
      create: data as any,
    });
  }
}
