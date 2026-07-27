'use client';

import { useState } from 'react';
import { api, Client } from '../lib/api';
import { IconX, IconRepo, IconPlus, IconTrash } from '../lib/icons';

type RepoDraft = { name: string; repoUrl: string };

export default function UserFormModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [repos, setRepos] = useState<RepoDraft[]>([{ name: '', repoUrl: '' }]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const setRepo = (i: number, patch: Partial<RepoDraft>) =>
    setRepos((r) => r.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));

  const addRepo = () => setRepos((r) => (r.length < 2 ? [...r, { name: '', repoUrl: '' }] : r));
  const removeRepo = (i: number) => setRepos((r) => r.filter((_, idx) => idx !== i));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // 1. Create the user
      const client = await api<Client>('clients', {
        method: 'POST',
        body: JSON.stringify({ name, company: company || undefined, email: email || undefined, whatsappNumber: whatsapp }),
      });

      // 2. Attach any filled repos (max 2, enforced by backend too)
      const filled = repos.filter((r) => r.name.trim() && r.repoUrl.trim()).slice(0, 2);
      for (const r of filled) {
        await api(`clients/${client.uuid}/projects`, {
          method: 'POST',
          body: JSON.stringify({ name: r.name, repoUrl: r.repoUrl }),
        });
      }

      onDone();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px' }}>
          <div>
            <h2 style={{ fontSize: 17 }}>Tambah User</h2>
            <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>Buat user, agen Hermes & memory-nya otomatis dibuat.</div>
          </div>
          <button className="btn btn-icon btn-subtle" onClick={onClose}><IconX size={16} /></button>
        </div>
        <hr className="divider" />

        <form onSubmit={submit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label className="label">Nama *</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Budi Santoso" required />
            </div>
            <div className="field">
              <label className="label">Perusahaan</label>
              <input className="input" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="PT Contoh" />
            </div>
            <div className="field">
              <label className="label">WhatsApp *</label>
              <input className="input" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="628123456789" required />
            </div>
            <div className="field">
              <label className="label">Email</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="budi@contoh.com" />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label className="label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><IconRepo size={15} /> Repositori (maks 2)</label>
              {repos.length < 2 && (
                <button type="button" className="btn btn-sm btn-subtle" onClick={addRepo}><IconPlus size={14} /> Repo</button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {repos.map((r, i) => (
                <div key={i} className="card" style={{ padding: 12, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8, flex: 1 }}>
                      <input className="input" value={r.name} onChange={(e) => setRepo(i, { name: e.target.value })} placeholder={`Nama repo ${i + 1}`} />
                      <input className="input" value={r.repoUrl} onChange={(e) => setRepo(i, { repoUrl: e.target.value })} placeholder="https://github.com/user/repo" />
                    </div>
                    {repos.length > 1 && (
                      <button type="button" className="btn btn-icon btn-danger" onClick={() => removeRepo(i)}><IconTrash size={15} /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="faint" style={{ fontSize: 12, marginTop: 8 }}>Repo boleh dikosongkan dan ditambah nanti.</div>
          </div>

          {error && <div className="badge badge-danger" style={{ justifyContent: 'flex-start', padding: '8px 12px', borderRadius: 10 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Simpan User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
