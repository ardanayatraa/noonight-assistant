'use client';

import { useEffect, useState, useCallback } from 'react';
import { api, Client, Project } from '../../lib/api';
import { IconPlus, IconRepo, IconTrash, IconCheck, IconX, IconSync, IconAlert, IconBot, IconWallet } from '../../lib/icons';
import UserFormModal from '../UserFormModal';

const IN_PROGRESS = (s: Project['status']) => s === 'cloning' || s === 'indexing';

function StatusBadge({ status }: { status: Project['status'] }) {
  const map: Record<Project['status'], string> = {
    ready: 'badge-success',
    indexing: 'badge-warning',
    cloning: 'badge-warning',
    error: 'badge-danger',
  };
  const label: Record<Project['status'], string> = {
    ready: 'siap', indexing: 'indexing', cloning: 'cloning', error: 'error',
  };
  return (
    <span className={`badge ${map[status]}`}>
      {IN_PROGRESS(status) ? <span className="spinner" style={{ width: 9, height: 9 }} /> : <span className="dot" />}
      {label[status]}
    </span>
  );
}

function AddRepoModal({ client, onClose, onDone }: { client: Client; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api(`clients/${client.uuid}/projects`, { method: 'POST', body: JSON.stringify({ name, repoUrl }) });
      onDone();
    } catch (err: any) {
      setError(err.message || 'Gagal menambah repo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="modal" style={{ maxWidth: 460 }} onMouseDown={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px' }}>
          <h2 style={{ fontSize: 17 }}>Tambah Repo · {client.name}</h2>
          <button className="btn btn-icon btn-subtle" onClick={onClose}><IconX size={16} /></button>
        </div>
        <hr className="divider" />
        <form onSubmit={submit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="field"><label className="label">Nama repo</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} required placeholder="my-app" /></div>
          <div className="field"><label className="label">GitHub URL</label><input className="input" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} required placeholder="https://github.com/user/repo" /></div>
          {error && <div className="badge badge-danger" style={{ justifyContent: 'flex-start', padding: '8px 12px', borderRadius: 10 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? <span className="spinner" /> : 'Tambah'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function balanceClass(n: number) {
  if (n <= 0) return 'badge-danger';
  if (n <= 5) return 'badge-warning';
  return 'badge-success';
}

function TopupModal({ client, onClose, onDone }: { client: Client; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState(25);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api(`clients/${client.uuid}/topup`, { method: 'POST', body: JSON.stringify({ amount }) });
      onDone();
    } catch (err: any) { setError(err.message || 'Gagal top-up.'); } finally { setLoading(false); }
  };

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onMouseDown={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px' }}>
          <div>
            <h2 style={{ fontSize: 17 }}>Top-up Saldo</h2>
            <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{client.name} · sisa {client.requestBalance ?? 0} request</div>
          </div>
          <button className="btn btn-icon btn-subtle" onClick={onClose}><IconX size={16} /></button>
        </div>
        <hr className="divider" />
        <form onSubmit={submit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {[10, 25, 50, 100].map((n) => (
              <button type="button" key={n} className={`btn btn-sm ${amount === n ? 'btn-primary' : 'btn-subtle'}`} onClick={() => setAmount(n)}>+{n}</button>
            ))}
          </div>
          <div className="field">
            <label className="label">Jumlah request ditambahkan (boleh negatif untuk koreksi)</label>
            <input className="input" type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
          </div>
          <div className="faint" style={{ fontSize: 12.5 }}>Saldo baru: {Math.max(0, (client.requestBalance ?? 0) + (Number.isFinite(amount) ? Math.trunc(amount) : 0))} request</div>
          {error && <div className="badge badge-danger" style={{ justifyContent: 'flex-start', padding: '8px 12px', borderRadius: 10 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={loading || !amount}>{loading ? <span className="spinner" /> : 'Terapkan'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UsersView() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addRepoFor, setAddRepoFor] = useState<Client | null>(null);
  const [topupFor, setTopupFor] = useState<Client | null>(null);
  const [busy, setBusy] = useState<string>('');
  const [syncing, setSyncing] = useState<string>('');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try { setClients((await api<Client[]>('clients')) || []); } catch {}
    if (!silent) setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Realtime indicator: while any repo is cloning/indexing, poll silently every 2.5s
  const inProgress = clients.some((c) => (c.projects || []).some((p) => IN_PROGRESS(p.status)));
  useEffect(() => {
    if (!inProgress) return;
    const t = setInterval(() => load(true), 2500);
    return () => clearInterval(t);
  }, [inProgress, load]);

  const setActive = async (client: Client, project: Project) => {
    setBusy(project.uuid);
    try {
      await api(`clients/${client.uuid}/active-project`, { method: 'PUT', body: JSON.stringify({ projectUuid: project.uuid }) });
      await load(true);
    } catch {} finally { setBusy(''); }
  };

  // Trigger clone / pull. Optimistically flip to "cloning" so the live poller kicks in.
  const doSync = async (project: Project) => {
    setSyncing(project.uuid);
    setClients((cs) => cs.map((c) => ({
      ...c,
      projects: (c.projects || []).map((p) =>
        p.uuid === project.uuid ? { ...p, status: 'cloning' as const, statusDetail: 'Memulai…' } : p),
    })));
    try {
      await api(`projects/${project.uuid}/sync`, { method: 'POST' });
      await load(true);
    } catch {} finally { setSyncing(''); }
  };

  const removeUser = async (client: Client) => {
    if (!confirm(`Hapus user "${client.name}" beserta repo, agen & memory-nya?`)) return;
    try { await api(`clients/${client.uuid}`, { method: 'DELETE' }); await load(); } catch {}
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 19 }}>Users & Repositori</h2>
          <div className="muted" style={{ fontSize: 13.5, marginTop: 3 }}>Maks 2 repo/user · agen read-only (tak bisa ubah code) · saldo 25 request awal, top-up kapan saja.</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}><IconPlus size={16} /> Tambah User</button>
      </div>

      {loading ? (
        <div className="card empty"><span className="spinner" /></div>
      ) : clients.length === 0 ? (
        <div className="card empty">Belum ada user. Klik “Tambah User”.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {clients.map((c) => {
            const projects = c.projects || [];
            const activeId = c.activeProjectId;
            return (
              <div className="card card-pad" key={c.uuid}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div className="avatar">{c.name.slice(0, 1).toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 650, fontSize: 15.5 }}>{c.name}</span>
                      {c.agent && <span className="badge badge-accent"><IconBot size={13} /> {c.agent.name}</span>}
                      <span className={`badge ${balanceClass(c.requestBalance ?? 0)}`} title={`${c.requestsUsed ?? 0} request terpakai`}>
                        <IconWallet size={13} /> {c.requestBalance ?? 0} request
                      </span>
                    </div>
                    <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{c.company || 'Tanpa perusahaan'} · {c.whatsappNumber}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-sm btn-subtle" onClick={() => setTopupFor(c)}>Top-up</button>
                    {projects.length < 2 && (
                      <button className="btn btn-sm btn-subtle" onClick={() => setAddRepoFor(c)}><IconPlus size={14} /> Repo</button>
                    )}
                    <button className="btn btn-sm btn-danger btn-icon" onClick={() => removeUser(c)}><IconTrash size={15} /></button>
                  </div>
                </div>

                <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: projects.length > 1 ? '1fr 1fr' : '1fr', gap: 10 }}>
                  {projects.length === 0 && <div className="faint" style={{ fontSize: 13 }}>Belum ada repo.</div>}
                  {projects.map((p) => {
                    const isActive = p.id === activeId;
                    return (
                      <div key={p.uuid} className="card" style={{ padding: 12, border: isActive ? '1px solid var(--accent)' : '1px solid var(--border)', background: isActive ? 'var(--accent-soft)' : 'var(--surface-2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <IconRepo size={15} />
                          <span style={{ fontWeight: 600, fontSize: 13.5, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                          {isActive && <span className="badge badge-accent" style={{ fontSize: 11 }}>aktif</span>}
                        </div>
                        <div className="mono muted" style={{ marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.repoUrl}</div>

                        {(p.statusDetail || p.status !== 'ready') && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12, color: p.status === 'error' ? 'var(--danger)' : 'var(--text-muted)' }}>
                            {IN_PROGRESS(p.status) && <span className="spinner" style={{ width: 11, height: 11 }} />}
                            {p.status === 'error' && <IconAlert size={13} />}
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.statusDetail || p.status}</span>
                          </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 10 }}>
                          <StatusBadge status={p.status} />
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="btn btn-sm btn-ghost"
                              disabled={syncing === p.uuid || IN_PROGRESS(p.status)}
                              onClick={() => doSync(p)}
                              title="Clone / tarik pembaruan terbaru dari GitHub"
                            >
                              {syncing === p.uuid || IN_PROGRESS(p.status)
                                ? <span className="spinner" />
                                : <><IconSync size={13} /> {p.status === 'error' ? 'Coba lagi' : p.status === 'ready' ? 'Sync' : 'Clone'}</>}
                            </button>
                            {!isActive && p.status === 'ready' && (
                              <button className="btn btn-sm btn-ghost" disabled={busy === p.uuid} onClick={() => setActive(c, p)}>
                                {busy === p.uuid ? <span className="spinner" /> : <><IconCheck size={13} /> Aktifkan</>}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && <UserFormModal onClose={() => setShowAdd(false)} onDone={() => { setShowAdd(false); load(); }} />}
      {addRepoFor && <AddRepoModal client={addRepoFor} onClose={() => setAddRepoFor(null)} onDone={() => { setAddRepoFor(null); load(); }} />}
      {topupFor && <TopupModal client={topupFor} onClose={() => setTopupFor(null)} onDone={() => { setTopupFor(null); load(); }} />}
    </div>
  );
}
