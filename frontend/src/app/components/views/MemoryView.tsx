'use client';

import { useEffect, useState, useCallback } from 'react';
import { api, Client, Project, MemoryItem } from '../../lib/api';
import { IconMemory, IconTrash, IconPlus, IconRepo } from '../../lib/icons';

function MemoryBlock({
  title, icon, scopePath, subtitle,
}: { title: string; icon: React.ReactNode; scopePath: string; subtitle?: string }) {
  const [items, setItems] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [type, setType] = useState<MemoryItem['type']>('knowledge');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems((await api<MemoryItem[]>(`${scopePath}/memory`)) || []); } catch {}
    setLoading(false);
  }, [scopePath]);
  useEffect(() => { load(); }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;
    setSaving(true);
    try {
      await api(`${scopePath}/memory`, { method: 'POST', body: JSON.stringify({ key, value, type }) });
      setKey(''); setValue(''); await load();
    } catch {} finally { setSaving(false); }
  };

  const del = async (k: string) => {
    try { await api(`${scopePath}/memory/${encodeURIComponent(k)}`, { method: 'DELETE' }); await load(); } catch {}
  };

  return (
    <div className="card card-pad">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <div className="stat-icon" style={{ width: 32, height: 32 }}>{icon}</div>
        <div>
          <div style={{ fontWeight: 650, fontSize: 14.5 }}>{title}</div>
          {subtitle && <div className="faint" style={{ fontSize: 12 }}>{subtitle}</div>}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '14px 0' }}>
        {loading ? (
          <div className="empty" style={{ padding: 18 }}><span className="spinner" /></div>
        ) : items.length === 0 ? (
          <div className="faint" style={{ fontSize: 13, padding: '6px 2px' }}>Belum ada memory.</div>
        ) : (
          items.map((m) => (
            <div key={m.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="mono" style={{ fontWeight: 600, color: 'var(--text)' }}>{m.key}</span>
                  <span className="badge" style={{ fontSize: 10.5 }}>{m.type}</span>
                </div>
                <div className="muted" style={{ fontSize: 13, marginTop: 3, wordBreak: 'break-word' }}>{m.value}</div>
              </div>
              <button className="btn btn-icon btn-danger btn-sm" onClick={() => del(m.key)}><IconTrash size={14} /></button>
            </div>
          ))
        )}
      </div>

      <form onSubmit={add} style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr auto auto', gap: 8 }}>
        <input className="input" value={key} onChange={(e) => setKey(e.target.value)} placeholder="key" />
        <input className="input" value={value} onChange={(e) => setValue(e.target.value)} placeholder="value" />
        <select className="select" style={{ width: 'auto' }} value={type} onChange={(e) => setType(e.target.value as any)}>
          <option value="knowledge">knowledge</option>
          <option value="preference">preference</option>
          <option value="context">context</option>
          <option value="system">system</option>
        </select>
        <button className="btn btn-primary btn-icon" disabled={saving} type="submit">{saving ? <span className="spinner" /> : <IconPlus size={16} />}</button>
      </form>
    </div>
  );
}

export default function MemoryView() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selected, setSelected] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Client[]>('clients').then((c) => {
      setClients(c || []);
      setSelected((c || [])[0] || null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <h2 style={{ fontSize: 19 }}>Memory</h2>
        <div className="muted" style={{ fontSize: 13.5, marginTop: 3 }}>Memory per-user (lintas repo) dan memory per-repo. Keduanya diinjeksi ke agen Hermes.</div>
      </div>

      {loading ? (
        <div className="card empty"><span className="spinner" /></div>
      ) : clients.length === 0 ? (
        <div className="card empty">Belum ada user.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 18, alignItems: 'start' }}>
          <div className="card" style={{ overflow: 'hidden' }}>
            {clients.map((c) => (
              <button key={c.uuid} className={`nav-item ${selected?.uuid === c.uuid ? 'active' : ''}`} style={{ borderRadius: 0 }} onClick={() => setSelected(c)}>
                <div className="avatar" style={{ width: 28, height: 28, fontSize: 12 }}>{c.name.slice(0, 1).toUpperCase()}</div>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
              </button>
            ))}
          </div>

          {selected && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <MemoryBlock
                title={`Memory User · ${selected.name}`}
                subtitle="Dibagi ke semua repositori milik user ini"
                icon={<IconMemory size={17} />}
                scopePath={`clients/${selected.uuid}`}
              />
              {(selected.projects || []).map((p: Project) => (
                <MemoryBlock
                  key={p.uuid}
                  title={`Memory Repo · ${p.name}`}
                  subtitle={p.repoUrl}
                  icon={<IconRepo size={16} />}
                  scopePath={`projects/${p.uuid}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
