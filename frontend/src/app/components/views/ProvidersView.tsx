'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '../../lib/api';
import { IconProvider, IconPlus, IconX, IconCheck } from '../../lib/icons';

type Provider = {
  id: number;
  name: string;
  provider: string;
  model: string;
  baseUrl?: string | null;
  isActive: boolean;
  isDefault: boolean;
};

function ProviderModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ name: '', provider: 'deepseek', model: 'deepseek-chat', apiKey: '', baseUrl: '', isDefault: true });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api('settings/ai-providers', { method: 'POST', body: JSON.stringify({ ...f, baseUrl: f.baseUrl || undefined }) });
      onDone();
    } catch (err: any) { setError(err.message || 'Gagal menyimpan.'); } finally { setLoading(false); }
  };

  const upd = (patch: Partial<typeof f>) => setF({ ...f, ...patch });

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px' }}>
          <h2 style={{ fontSize: 17 }}>Tambah / Update Provider</h2>
          <button className="btn btn-icon btn-subtle" onClick={onClose}><IconX size={16} /></button>
        </div>
        <hr className="divider" />
        <form onSubmit={submit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field"><label className="label">Nama unik *</label><input className="input" value={f.name} onChange={(e) => upd({ name: e.target.value })} placeholder="default" required /></div>
            <div className="field"><label className="label">Provider *</label>
              <select className="select" value={f.provider} onChange={(e) => upd({ provider: e.target.value })}>
                {['deepseek', 'openai', 'openrouter', 'claude', 'gemini', 'ollama'].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="field"><label className="label">Model *</label><input className="input" value={f.model} onChange={(e) => upd({ model: e.target.value })} required /></div>
            <div className="field"><label className="label">Base URL</label><input className="input" value={f.baseUrl} onChange={(e) => upd({ baseUrl: e.target.value })} placeholder="opsional" /></div>
          </div>
          <div className="field"><label className="label">API Key *</label><input className="input" type="password" value={f.apiKey} onChange={(e) => upd({ apiKey: e.target.value })} placeholder="sk-…" required /></div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, cursor: 'pointer' }}>
            <input type="checkbox" checked={f.isDefault} onChange={(e) => upd({ isDefault: e.target.checked })} />
            Jadikan provider default
          </label>
          {error && <div className="badge badge-danger" style={{ justifyContent: 'flex-start', padding: '8px 12px', borderRadius: 10 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? <span className="spinner" /> : 'Simpan'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProvidersView() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setProviders((await api<Provider[]>('settings/ai-providers')) || []); } catch {}
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 19 }}>AI Providers</h2>
          <div className="muted" style={{ fontSize: 13.5, marginTop: 3 }}>Sumber model default. Agen boleh override provider/model per user.</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShow(true)}><IconPlus size={16} /> Provider</button>
      </div>

      {loading ? (
        <div className="card empty"><span className="spinner" /></div>
      ) : providers.length === 0 ? (
        <div className="card empty">Belum ada provider. Tambahkan minimal satu (mis. DeepSeek) dan jadikan default.</div>
      ) : (
        <div className="card">
          {providers.map((p) => (
            <div className="row" key={p.id}>
              <div className="avatar" style={{ background: 'var(--accent-soft)' }}><IconProvider size={19} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 600 }}>{p.name}</span>
                  {p.isDefault && <span className="badge badge-accent"><IconCheck size={12} /> default</span>}
                </div>
                <div className="muted" style={{ fontSize: 13 }}>{p.provider} · {p.model}</div>
              </div>
              <span className={`badge ${p.isActive ? 'badge-success' : ''}`}><span className="dot" />{p.isActive ? 'aktif' : 'off'}</span>
            </div>
          ))}
        </div>
      )}

      {show && <ProviderModal onClose={() => setShow(false)} onDone={() => { setShow(false); load(); }} />}
    </div>
  );
}
