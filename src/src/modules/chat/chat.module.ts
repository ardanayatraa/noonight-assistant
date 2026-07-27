import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ClientsModule } from '../clients/clients.module';
import { WorkspaceModule } from '../workspace/workspace.module';
import { AiModule } from '../ai/ai.module';
import { AgentsModule } from '../agents/agents.module';
import { MemoryModule } from '../memory/memory.module';

@Module({
  imports: [ClientsModule, WorkspaceModule, AiModule, AgentsModule, MemoryModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
