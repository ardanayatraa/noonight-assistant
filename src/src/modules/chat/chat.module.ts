import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ClientsModule } from '../clients/clients.module';
import { WorkspaceModule } from '../workspace/workspace.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [ClientsModule, WorkspaceModule, AiModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
