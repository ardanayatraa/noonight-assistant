import { Controller, Get, Post, HttpCode, Headers } from '@nestjs/common';
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

  // Consumed by the WA bridge (localhost) with a shared secret, not the admin JWT.
  @Public()
  @Get('roster')
  roster(@Headers('x-bridge-secret') secret?: string) {
    return this.whatsapp.roster(secret);
  }
}
