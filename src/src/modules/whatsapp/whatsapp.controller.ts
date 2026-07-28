import { Controller, Get, Post, HttpCode, Req } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { Public } from '../../common/decorators/public.decorator';

// Admin-only (global JwtAuthGuard) — the QR must never be public.
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

  // Consumed by the local WA bridge only. Public route, but gated to localhost:
  // external calls reach the API via nginx and carry X-Forwarded-For.
  @Public()
  @Get('roster')
  roster(@Req() req: any) {
    const xff = req.headers?.['x-forwarded-for'];
    const ip = String(req.socket?.remoteAddress || req.ip || '');
    const local = !xff && (ip.includes('127.0.0.1') || ip === '::1');
    return this.whatsapp.roster(local);
  }
}
