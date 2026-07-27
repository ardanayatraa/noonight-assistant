import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { ChatService } from './chat.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // Hermes WhatsApp webhook endpoint
  @Public()
  @Post('webhook/whatsapp')
  @HttpCode(200)
  async whatsappWebhook(@Body() body: { from: string; body: string }) {
    const reply = await this.chatService.handleWhatsAppMessage(
      body.from,
      body.body,
    );
    return { to: body.from, body: reply };
  }

  // Web chat endpoint
  @Public()
  @Post('webhook/chat')
  @HttpCode(200)
  async webChat(@Body() body: { sessionId: string; message: string }) {
    // Web chat uses session ID instead of phone number
    // For now, use the sessionId as the "from" identifier
    const reply = await this.chatService.handleWhatsAppMessage(
      body.sessionId,
      body.message,
    );
    return { reply };
  }
}
