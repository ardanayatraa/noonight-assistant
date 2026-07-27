'use client';

import { useEffect, useState } from 'react';
import { auth } from './lib/api';
import { IconSun, IconMoon, IconLogout } from './lib/icons';
import Login from './components/Login';
import Sidebar, { View } from './components/Sidebar';
import DashboardView from './components/views/DashboardView';
import UsersView from './components/views/UsersView';
import AgentsView from './components/views/AgentsView';
import MemoryView from './components/views/MemoryView';
import ProvidersView from './components/views/ProvidersView';

export const dynamic = 'force-dynamic';

const TITLES: Record<View, string> = {
  dashboard: 'Dashboard',
  users: 'Users & Repositori',
  agents: 'Hermes Agents',
  memory: 'Memory',
  providers: 'AI Providers',
};

export default function Page() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [view, setView] = useState<View>('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    setAuthed(!!auth.get());
    const saved = (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    setTheme(saved);
    setReady(true);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  const logout = () => { auth.clear(); setAuthed(false); };

  if (!ready) return null;
  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;

  return (
    <div className="shell">
      <Sidebar view={view} setView={setView} />
      <div className="main">
        <header className="topbar">
          <h1 style={{ fontSize: 17 }}>{TITLES[view]}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn btn-icon btn-ghost" onClick={toggleTheme} title="Ganti tema">
              {theme === 'dark' ? <IconSun size={17} /> : <IconMoon size={17} />}
            </button>
            <button className="btn btn-sm btn-ghost" onClick={logout}><IconLogout size={16} /> Keluar</button>
          </div>
        </header>

        <main className="content">
          {view === 'dashboard' && <DashboardView goUsers={() => setView('users')} />}
          {view === 'users' && <UsersView />}
          {view === 'agents' && <AgentsView />}
          {view === 'memory' && <MemoryView />}
          {view === 'providers' && <ProvidersView />}
        </main>
      </div>
    </div>
  );
}
