import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

const BRIDGE = process.env.WA_BRIDGE_URL || 'http://127.0.0.1:3457';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(private prisma: PrismaService) {}

  /** Live connection status + pairing QR (data URL), proxied from the bridge. */
  async status(): Promise<{ status: string; qr: string | null; me: string | null }> {
    try {
      const r = await fetch(`${BRIDGE}/status`, { signal: AbortSignal.timeout(5000) });
      if (!r.ok) return { status: 'offline', qr: null, me: null };
      const d = (await r.json()) as any;
      return { status: d.status ?? 'offline', qr: d.qr ?? null, me: d.me ?? null };
    } catch {
      return { status: 'offline', qr: null, me: null };
    }
  }

  async logout(): Promise<{ ok: boolean }> {
    try {
      await fetch(`${BRIDGE}/logout`, { method: 'POST', signal: AbortSignal.timeout(5000) });
    } catch (e: any) {
      this.logger.warn(`WA logout failed: ${e.message}`);
    }
    return { ok: true };
  }

  /**
   * Roster of active client phone numbers — consumed by the local WA bridge to
   * build a LID→phone map (WhatsApp addresses senders by LID, not phone number).
   * Restricted to localhost callers (the bridge), never reachable externally.
   */
  async roster(local: boolean): Promise<{ numbers: string[] }> {
    if (!local) {
      throw new ForbiddenException('Local access only');
    }
    const clients = await this.prisma.client.findMany({
      where: { status: 'active' },
      select: { whatsappNumber: true },
    });
    return { numbers: clients.map((c) => c.whatsappNumber).filter(Boolean) };
  }
}
