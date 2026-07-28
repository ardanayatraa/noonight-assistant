import { Controller, Get, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD } from '@nestjs/core';
import { PrismaService } from './database/prisma.service';
import { PrismaModule } from './database/prisma.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { Public } from './common/decorators/public.decorator';
import { ClientsModule } from './modules/clients/clients.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { GitHubModule } from './modules/github/github.module';
import { WorkspaceModule } from './modules/workspace/workspace.module';
import { AiModule } from './modules/ai/ai.module';
import { ChatModule } from './modules/chat/chat.module';
import { SettingsModule } from './modules/settings/settings.module';
import { AuthModule } from './modules/auth/auth.module';
import { AgentsModule } from './modules/agents/agents.module';
import { MemoryModule } from './modules/memory/memory.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';

@Controller()
export class AppController {
  constructor(private prisma: PrismaService) {}

  @Public()
  @Get('health')
  async health() {
    let dbOk = false;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbOk = true;
    } catch {}

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbOk ? 'connected' : 'disconnected',
    };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 30 }]),
    EventEmitterModule.forRoot(),
    PrismaModule,
    AuthModule,
    ClientsModule,
    ProjectsModule,
    GitHubModule,
    WorkspaceModule,
    AiModule,
    ChatModule,
    SettingsModule,
    AgentsModule,
    MemoryModule,
    WhatsappModule,
  ],
  controllers: [AppController],
  providers: [
    // Verify the admin JWT on every route unless marked @Public
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
