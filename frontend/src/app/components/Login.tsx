'use client';

import { useState } from 'react';
import { api, auth } from '../lib/api';
import { IconLogo } from '../lib/icons';

export default function Login({ onSuccess }: { onSuccess: () => void }) {
  const [mode, setMode] = useState<'login' | 'setup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const path = mode === 'login' ? 'auth/login' : 'auth/setup';
      const body = mode === 'login' ? { email, password } : { name, email, password };
      const data = await api<{ token: string }>(path, { method: 'POST', body: JSON.stringify(body) });
      if (data?.token) {
        auth.set(data.token);
        onSuccess();
      } else {
        setError('Login gagal.');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20, background: 'var(--bg)' }}>
      <div className="card card-pad" style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
          <div style={{ width: 44, height: 44, borderRadius: 13, display: 'grid', placeItems: 'center', background: 'var(--accent)', color: 'var(--accent-contrast)' }}><IconLogo size={24} /></div>
          <div>
            <h1 style={{ fontSize: 18 }}>Noonight Assistant</h1>
            <div className="muted" style={{ fontSize: 13 }}>Admin Console</div>
          </div>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'setup' && (
            <div className="field">
              <label className="label">Nama admin</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama Anda" required />
            </div>
          )}
          <div className="field">
            <label className="label">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@noonight.dev" required />
          </div>
          <div className="field">
            <label className="label">Password</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>

          {error && (
            <div className="badge badge-danger" style={{ justifyContent: 'flex-start', padding: '8px 12px', borderRadius: 10 }}>{error}</div>
          )}

          <button className="btn btn-primary" style={{ width: '100%', padding: 11 }} disabled={loading} type="submit">
            {loading ? <span className="spinner" /> : mode === 'login' ? 'Masuk' : 'Buat admin & masuk'}
          </button>
        </form>

        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13 }} className="muted">
          {mode === 'login' ? (
            <>Pertama kali? <button className="link" onClick={() => { setMode('setup'); setError(''); }} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Buat akun admin</button></>
          ) : (
            <>Sudah punya akun? <button onClick={() => { setMode('login'); setError(''); }} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Masuk</button></>
          )}
        </div>
      </div>
    </div>
  );
}
