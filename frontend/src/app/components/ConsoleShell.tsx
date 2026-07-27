'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { auth } from '../lib/api';
import { IconSun, IconMoon, IconLogout } from '../lib/icons';
import Login from './Login';
import Sidebar, { NAV } from './Sidebar';

function titleFor(pathname: string): string {
  const item = NAV.find((n) => pathname === n.href || pathname.startsWith(n.href + '/'));
  return item?.label ?? 'Noonight';
}

export default function ConsoleShell({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const pathname = usePathname() ?? '';

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
      <Sidebar />
      <div className="main">
        <header className="topbar">
          <h1 style={{ fontSize: 17 }}>{titleFor(pathname)}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn btn-icon btn-ghost" onClick={toggleTheme} title="Ganti tema">
              {theme === 'dark' ? <IconSun size={17} /> : <IconMoon size={17} />}
            </button>
            <button className="btn btn-sm btn-ghost" onClick={logout}><IconLogout size={16} /> Keluar</button>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
