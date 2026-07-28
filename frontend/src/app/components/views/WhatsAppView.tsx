'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '../../lib/api';
import { IconWhatsApp, IconCheck } from '../../lib/icons';

type WaStatus = { status: string; qr: string | null; me: string | null };

const LABEL: Record<string, { text: string; cls: string }> = {
  connected: { text: 'Tersambung', cls: 'badge-success' },
  qr: { text: 'Menunggu scan QR', cls: 'badge-warning' },
  connecting: { text: 'Menyambungkan…', cls: 'badge-warning' },
  close: { text: 'Terputus', cls: 'badge-danger' },
  offline: { text: 'Bridge mati', cls: 'badge-danger' },
};

export default function WhatsAppView() {
  const [wa, setWa] = useState<WaStatus>({ status: 'connecting', qr: null, me: null });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setWa(await api<WaStatus>('whatsapp/status')); } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  // Live refresh: fast while pairing/connecting, calmer once connected
  useEffect(() => {
    const ms = wa.status === 'connected' ? 8000 : 2500;
    const t = setInterval(load, ms);
    return () => clearInterval(t);
  }, [wa.status, load]);

  const logout = async () => {
    if (!confirm('Putuskan & keluar dari WhatsApp? Perlu scan QR lagi untuk menyambung.')) return;
    setBusy(true);
    try { await api('whatsapp/logout', { method: 'POST' }); await load(); } catch {} finally { setBusy(false); }
  };

  const lbl = LABEL[wa.status] || LABEL.offline;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <h2 style={{ fontSize: 19 }}>WhatsApp</h2>
        <div className="muted" style={{ fontSize: 13.5, marginTop: 3 }}>
          Koneksi WhatsApp milik noonight (read-only, per-user). Client chat ke sini → agen Hermes project-nya. Tanpa akses server.
        </div>
      </div>

      <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="stat-icon" style={{ width: 40, height: 40, background: 'var(--success-soft)', color: 'var(--success)' }}>
            <IconWhatsApp size={22} />
          </div>
          <span className={`badge ${lbl.cls}`}><span className="dot" />{loading ? 'Memuat…' : lbl.text}</span>
        </div>

        {loading ? (
          <div className="empty"><span className="spinner" /></div>
        ) : wa.status === 'connected' ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '10px 0' }}>
            <div style={{ width: 66, height: 66, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--success-soft)', color: 'var(--success)' }}>
              <IconCheck size={30} />
            </div>
            <div style={{ fontWeight: 650 }}>Tersambung{wa.me ? ` sebagai ${wa.me}` : ''}</div>
            <div className="muted" style={{ fontSize: 13, maxWidth: 380 }}>
              Client terdaftar sekarang bisa chat nomor ini untuk bertanya soal project mereka.
            </div>
            <button className="btn btn-danger btn-sm" onClick={logout} disabled={busy} style={{ marginTop: 6 }}>
              {busy ? <span className="spinner" /> : 'Putuskan / ganti nomor'}
            </button>
          </div>
        ) : wa.status === 'qr' && wa.qr ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <img src={wa.qr} alt="WhatsApp QR" width={260} height={260} style={{ borderRadius: 12, background: '#fff', padding: 10 }} />
            <div className="muted" style={{ fontSize: 13, maxWidth: 380, lineHeight: 1.5 }}>
              Buka <b>WhatsApp</b> di HP → <b>Perangkat Tertaut</b> → <b>Tautkan Perangkat</b>, lalu scan QR ini. QR menyegar otomatis.
            </div>
          </div>
        ) : wa.status === 'offline' ? (
          <div className="empty" style={{ padding: '20px' }}>
            Bridge WhatsApp belum berjalan di server. Pastikan proses <span className="mono">wa-bridge</span> aktif.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: 16 }}>
            <span className="spinner" />
            <div className="muted" style={{ fontSize: 13 }}>Menyiapkan koneksi… QR akan muncul sebentar lagi.</div>
          </div>
        )}
      </div>
    </div>
  );
}
