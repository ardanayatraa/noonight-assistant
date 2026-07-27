'use client';

import { useEffect, useState, useCallback } from 'react';
import { api, Client, Agent } from '../../lib/api';
import { IconBot, IconCheck } from '../../lib/icons';

function AgentEditor({ client, onSaved }: { client: Client; onSaved: () => void }) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api<Agent>(`clients/${client.uuid}/agent`).then((a) => { setAgent(a); setLoading(false); }).catch(() => setLoading(false));
  }, [client.uuid]);

  const save = async () => {
    if (!agent) return;
    setSaving(true); setSaved(false);
    try {
      await api(`clients/${client.uuid}/agent`, {
        method: 'PUT',
        body: JSON.stringify({
          name: agent.name,
          persona: agent.persona,
          provider: agent.provider || null,
          model: agent.model || null,
          temperature: Number(agent.temperature) || 0.3,
          isActive: agent.isActive,
        }),
      });
      setSaved(true);
      onSaved();
      setTimeout(() => setSaved(false), 1800);
    } catch {} finally { setSaving(false); }
  };

  if (loading || !agent) return <div className="empty" style={{ padding: 24 }}><span className="spinner" /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 2px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="field">
          <label className="label">Nama agen</label>
          <input className="input" value={agent.name} onChange={(e) => setAgent({ ...agent, name: e.target.value })} />
        </div>
        <div className="field">
          <label className="label">Status</label>
          <select className="select" value={agent.isActive ? 'on' : 'off'} onChange={(e) => setAgent({ ...agent, isActive: e.target.value === 'on' })}>
            <option value="on">Aktif</option>
            <option value="off">Nonaktif</option>
          </select>
        </div>
      </div>

      <div className="field">
        <label className="label">Persona / instruksi sistem</label>
        <textarea className="textarea" value={agent.persona || ''} onChange={(e) => setAgent({ ...agent, persona: e.target.value })} placeholder="Gaya bicara & aturan khusus agen untuk user ini…" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <div className="field">
          <label className="label">Provider override</label>
          <input className="input" value={agent.provider || ''} onChange={(e) => setAgent({ ...agent, provider: e.target.value })} placeholder="deepseek" />
        </div>
        <div className="field">
          <label className="label">Model override</label>
          <input className="input" value={agent.model || ''} onChange={(e) => setAgent({ ...agent, model: e.target.value })} placeholder="deepseek-chat" />
        </div>
        <div className="field">
          <label className="label">Temperature</label>
          <input className="input" type="number" step="0.1" min="0" max="2" value={agent.temperature ?? 0.3} onChange={(e) => setAgent({ ...agent, temperature: Number(e.target.value) })} />
        </div>
      </div>
      <div className="faint" style={{ fontSize: 12 }}>Kosongkan provider/model untuk memakai default global. Agen ini melayani semua repo milik user.</div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? <span className="spinner" /> : saved ? <><IconCheck size={15} /> Tersimpan</> : 'Simpan Agen'}
        </button>
      </div>
    </div>
  );
}

export default function AgentsView() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setClients((await api<Client[]>('clients')) || []); } catch {}
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <h2 style={{ fontSize: 19 }}>Hermes Agents</h2>
        <div className="muted" style={{ fontSize: 13.5, marginTop: 3 }}>Satu agen per user, melayani semua repo miliknya sesuai repo aktif.</div>
      </div>

      {loading ? (
        <div className="card empty"><span className="spinner" /></div>
      ) : clients.length === 0 ? (
        <div className="card empty">Belum ada user/agen.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {clients.map((c) => (
            <div className="card card-pad" key={c.uuid}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }} onClick={() => setOpen(open === c.uuid ? '' : c.uuid)}>
                <div className="avatar" style={{ background: 'var(--accent-soft)' }}><IconBot size={20} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 650 }}>{c.agent?.name || 'Hermes'}</div>
                  <div className="muted" style={{ fontSize: 13 }}>untuk {c.name} · {c.projects?.length || 0} repo</div>
                </div>
                <span className={`badge ${c.agent?.isActive ? 'badge-success' : ''}`}><span className="dot" />{c.agent?.isActive ? 'aktif' : 'nonaktif'}</span>
                <button className="btn btn-sm btn-ghost">{open === c.uuid ? 'Tutup' : 'Edit'}</button>
              </div>
              {open === c.uuid && (<><hr className="divider" style={{ margin: '16px 0' }} /><AgentEditor client={c} onSaved={load} /></>)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
