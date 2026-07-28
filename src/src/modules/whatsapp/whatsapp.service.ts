import { Injectable, Logger } from '@nestjs/common';

const BRIDGE = process.env.WA_BRIDGE_URL || 'http://127.0.0.1:3457';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  /** Live connection status + pairing QR (data URL), proxied from the bridge. */
  async status(): Promise<{ status: string; qr: string | null; me: string | null }> {
    try {
      const r = await fetch(`${BRIDGE}/status`, { signal: AbortSignal.timeout(5000) });
      if (!r.ok) return { status: 'offline', qr: null, me: null };
      const d = (await r.json()) as any;
      return { status: d.status ?? 'offline', qr: d.qr ?? null, me: d.me ?? null };
    } catch {
      // Bridge process not reachable
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
}
