'use client';

import { useState } from 'react';

export const dynamic = 'force-dynamic';

export default function Dashboard() {
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [view, setView] = useState<'login' | 'dashboard'>('login');
  const [showAddClient, setShowAddClient] = useState(false);
  const [showAddProject, setShowAddProject] = useState(false);
  const [selectedClientUuid, setSelectedClientUuid] = useState('');

  const api = async (path: string, options?: RequestInit) => {
    const res = await fetch(`/api/v1/${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });
    return res.json();
  };

  const handleLogin = async () => {
    const data = await api('auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.token) {
      setToken(data.token);
      setView('dashboard');
      loadData(data.token);
    }
  };

  const loadData = async (t: string) => {
    const c = await api('clients');
    setClients(c);
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as any;
    await api('clients', {
      method: 'POST',
      body: JSON.stringify({
        name: form.name.value,
        company: form.company.value,
        whatsappNumber: form.whatsapp.value,
      }),
    });
    setShowAddClient(false);
    loadData(token);
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as any;
    await api(`clients/${selectedClientUuid}/projects`, {
      method: 'POST',
      body: JSON.stringify({
        name: form.name.value,
        repoUrl: form.repoUrl.value,
      }),
    });
    setShowAddProject(false);
    loadData(token);
  };

  if (view === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="p-8 rounded-xl w-full max-w-md" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h1 className="text-2xl font-bold mb-6">🛸 Noonight Assistant</h1>
          <input
            className="w-full p-3 mb-3 rounded-lg border"
            style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <input
            className="w-full p-3 mb-4 rounded-lg border"
            style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <button
            className="w-full p-3 rounded-lg font-semibold text-white"
            style={{ background: 'var(--accent)' }}
            onClick={handleLogin}
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* Header */}
      <header className="px-6 py-4 flex justify-between items-center border-b" style={{ borderColor: 'var(--border)' }}>
        <h1 className="text-xl font-bold">🛸 Noonight Assistant</h1>
        <button
          className="px-4 py-2 rounded-lg text-sm"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          onClick={() => { setToken(''); setView('login'); }}
        >
          Logout
        </button>
      </header>

      <div className="p-6 max-w-7xl mx-auto">
        {/* Clients Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Clients</h2>
            <button
              className="px-4 py-2 rounded-lg text-sm text-white"
              style={{ background: 'var(--accent)' }}
              onClick={() => setShowAddClient(true)}
            >
              + Add Client
            </button>
          </div>

          {showAddClient && (
            <form onSubmit={handleAddClient} className="mb-4 p-4 rounded-lg" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <input name="name" placeholder="Name *" required className="p-2 rounded border" style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }} />
                <input name="company" placeholder="Company" className="p-2 rounded border" style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }} />
                <input name="whatsapp" placeholder="WhatsApp (628xxx) *" required className="p-2 rounded border" style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }} />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 rounded text-sm text-white" style={{ background: 'var(--accent)' }}>Save</button>
                <button type="button" onClick={() => setShowAddClient(false)} className="px-4 py-2 rounded text-sm" style={{ background: 'var(--bg)' }}>Cancel</button>
              </div>
            </form>
          )}

          <div className="grid gap-3">
            {clients.map((c: any) => (
              <div key={c.uuid} className="p-4 rounded-lg flex justify-between items-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div>
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {c.company || 'No company'} · WhatsApp: {c.whatsappNumber} · {c.projects?.length || 0} projects
                  </div>
                </div>
                <button
                  className="px-3 py-1 rounded text-sm"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
                  onClick={() => { setSelectedClientUuid(c.uuid); setShowAddProject(true); }}
                >
                  + Project
                </button>
              </div>
            ))}
            {clients.length === 0 && (
              <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                No clients yet. Add your first client.
              </div>
            )}
          </div>
        </div>

        {/* Add Project Modal */}
        {showAddProject && (
          <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.6)' }}>
            <form onSubmit={handleAddProject} className="p-6 rounded-xl w-full max-w-md" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <h3 className="text-lg font-semibold mb-4">Add Project</h3>
              <input name="name" placeholder="Project name *" required className="w-full p-2 rounded border mb-3" style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }} />
              <input name="repoUrl" placeholder="GitHub URL *" required className="w-full p-2 rounded border mb-4" style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }} />
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 rounded text-sm text-white" style={{ background: 'var(--accent)' }}>Create</button>
                <button type="button" onClick={() => setShowAddProject(false)} className="px-4 py-2 rounded text-sm" style={{ background: 'var(--bg)' }}>Cancel</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
