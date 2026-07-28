/**
 * Noonight WhatsApp Bridge (Baileys)
 * -----------------------------------
 * A dedicated WhatsApp connection owned by Noonight (NOT hermes-agent).
 * Inbound client DMs are forwarded to the Noonight API webhook, which replies
 * with the per-user (read-only, project-scoped) agent answer.
 *
 * HTTP API (bound to localhost, proxied by the Noonight backend):
 *   GET  /status  -> { status: 'connecting'|'qr'|'connected'|'close'|'offline', qr, me }
 *   POST /logout  -> unpair the current WhatsApp account
 */
const fs = require('fs');
const path = require('path');
const express = require('express');
const qrcode = require('qrcode');
const pino = require('pino');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');

const PORT = Number(process.env.WA_BRIDGE_PORT || 3457);
const NOONIGHT_WEBHOOK =
  process.env.NOONIGHT_WEBHOOK || 'http://127.0.0.1:3001/api/v1/webhook/whatsapp';
const SESSION_DIR = process.env.WA_SESSION_DIR || path.join(__dirname, 'session');
const ROSTER_URL =
  process.env.NOONIGHT_ROSTER_URL || 'http://127.0.0.1:3001/api/v1/whatsapp/roster';
const BRIDGE_SECRET = process.env.WA_BRIDGE_SECRET || '';

const logger = pino({ level: 'silent' });
let sock = null;
const state = { status: 'connecting', qr: null, me: null, updatedAt: Date.now() };

// LID → phone-number map. WhatsApp addresses senders by LID and hides the phone
// number, so we resolve it by asking onWhatsApp() for each registered client.
const lidToPhone = new Map();
let rosterRefreshing = false;

async function refreshRoster() {
  if (rosterRefreshing || !sock) return;
  rosterRefreshing = true;
  try {
    const r = await fetch(ROSTER_URL, {
      headers: BRIDGE_SECRET ? { 'x-bridge-secret': BRIDGE_SECRET } : {},
    });
    if (!r.ok) {
      console.error('[wa] roster fetch failed:', r.status);
      return;
    }
    const { numbers } = await r.json();
    let mapped = 0;
    for (const phone of numbers || []) {
      try {
        const res = await sock.onWhatsApp(phone);
        const item = Array.isArray(res) ? res[0] : null;
        const lid = item?.lid || item?.lidJid;
        if (lid) {
          lidToPhone.set(String(lid).split('@')[0].split(':')[0], phone);
          mapped++;
        }
      } catch { /* per-number */ }
    }
    console.log(`[wa] roster synced: ${(numbers || []).length} clients, ${mapped} LIDs mapped (total ${lidToPhone.size})`);
  } catch (e) {
    console.error('[wa] roster error:', e.message);
  } finally {
    rosterRefreshing = false;
  }
}

function setState(patch) {
  Object.assign(state, patch, { updatedAt: Date.now() });
}

/**
 * Resolve the sender's real phone number. Modern WhatsApp addresses chats by
 * LID (@lid), not the phone JID (@s.whatsapp.net). Prefer any phone-number JID
 * on the key; otherwise map the LID → phone number via Baileys' lid mapping.
 */
async function resolveSenderNumber(sock, key) {
  const cands = [key.remoteJid, key.remoteJidAlt, key.participant, key.participantAlt]
    .filter((j) => typeof j === 'string' && j);

  // 1) A phone-number JID is already present
  const pn = cands.find((j) => j.endsWith('@s.whatsapp.net'));
  if (pn) return pn.split('@')[0].split(':')[0];

  // 2) LID sender → resolve via the roster map (refresh once on a miss)
  const lidJid = cands.find((j) => j.endsWith('@lid'));
  if (lidJid) {
    const lidNum = lidJid.split('@')[0].split(':')[0];
    if (lidToPhone.has(lidNum)) return lidToPhone.get(lidNum);
    // Try baileys' own mapping first
    const lm = sock?.signalRepository?.lidMapping;
    for (const fn of ['getPNForLID', 'getPnForLid']) {
      try {
        if (lm && typeof lm[fn] === 'function') {
          const r = await lm[fn](lidJid);
          const val = typeof r === 'string' ? r : r?.pn || r?.jid || '';
          if (val && val.endsWith('@s.whatsapp.net')) return val.split('@')[0].split(':')[0];
        }
      } catch { /* ignore */ }
    }
    // Refresh the client roster once, then re-check
    await refreshRoster();
    if (lidToPhone.has(lidNum)) return lidToPhone.get(lidNum);
    return lidNum; // fallback — Noonight will report "not registered"
  }

  return (cands[0] || '').split('@')[0].split(':')[0];
}

async function start() {
  const { state: authState, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: authState,
    logger,
    printQRInTerminal: false,
    browser: ['Noonight Assistant', 'Chrome', '1.0.0'],
    markOnlineOnConnect: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      try {
        setState({ status: 'qr', qr: await qrcode.toDataURL(qr) });
      } catch {
        setState({ status: 'qr', qr: null });
      }
    }

    if (connection === 'open') {
      const me = sock.user?.id ? sock.user.id.split(':')[0].split('@')[0] : null;
      setState({ status: 'connected', qr: null, me });
      console.log('[wa] connected as', me);
      setTimeout(() => refreshRoster().catch(() => {}), 3000); // let sync settle
    }

    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      setState({ status: 'close' });
      if (code === DisconnectReason.loggedOut) {
        console.log('[wa] logged out — clearing session, will show a new QR');
        setState({ me: null, qr: null });
        try { fs.rmSync(SESSION_DIR, { recursive: true, force: true }); } catch {}
        setTimeout(start, 1500);
      } else {
        console.log('[wa] connection closed, reconnecting…', code);
        setTimeout(start, 2500);
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      try {
        if (!msg.message || msg.key.fromMe) continue;
        const jid = msg.key.remoteJid || '';
        if (jid.endsWith('@g.us') || jid.endsWith('@broadcast')) continue; // DMs only

        const text =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          msg.message.imageMessage?.caption ||
          msg.message.videoMessage?.caption ||
          '';
        if (!text.trim()) continue;

        const from = await resolveSenderNumber(sock, msg.key);
        console.log(
          `[wa] inbound from=${from} jid=${jid} alt=${msg.key.remoteJidAlt || '-'} :: ${text.slice(0, 60)}`,
        );

        await sock.sendPresenceUpdate('composing', jid).catch(() => {});
        const resp = await fetch(NOONIGHT_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ from, body: text }),
        });
        if (resp.ok) {
          const data = await resp.json().catch(() => ({}));
          const reply = data.body || data.reply || '';
          if (reply) await sock.sendMessage(jid, { text: reply });
        } else {
          console.error('[wa] noonight webhook error', resp.status);
        }
      } catch (e) {
        console.error('[wa] message handling error:', e.message);
      }
    }
  });
}

// ---- Local HTTP control API ----
const app = express();
app.use(express.json());
app.get('/', (_req, res) => res.json({ ok: true, status: state.status }));
app.get('/status', (_req, res) =>
  res.json({ status: state.status, qr: state.qr, me: state.me, updatedAt: state.updatedAt }),
);
app.post('/logout', async (_req, res) => {
  try {
    if (sock) await sock.logout();
  } catch (e) {
    console.error('[wa] logout error:', e.message);
  }
  res.json({ ok: true });
});

app.listen(PORT, '127.0.0.1', () =>
  console.log(`[wa] bridge on http://127.0.0.1:${PORT} → ${NOONIGHT_WEBHOOK}`),
);

// Keep the LID→phone map fresh (picks up newly registered clients)
setInterval(() => refreshRoster().catch(() => {}), 10 * 60 * 1000);

start().catch((e) => {
  console.error('[wa] fatal start error:', e);
  process.exit(1);
});
