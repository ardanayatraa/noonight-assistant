import { Controller, Get, Post, HttpCode } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';

// Admin-only (protected by the global JwtAuthGuard) — the QR must never be public.
@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsapp: WhatsappService) {}

  @Get('status')
  status() {
    return this.whatsapp.status();
  }

  @Post('logout')
  @HttpCode(200)
  logout() {
    return this.whatsapp.logout();
  }
}
