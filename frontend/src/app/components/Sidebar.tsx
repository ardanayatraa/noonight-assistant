'use client';

import {
  IconDashboard,
  IconUsers,
  IconBot,
  IconMemory,
  IconProvider,
} from '../lib/icons';

export type View = 'dashboard' | 'users' | 'agents' | 'memory' | 'providers';

const NAV: { key: View; label: string; icon: (p: any) => JSX.Element }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: IconDashboard },
  { key: 'users', label: 'Users & Repos', icon: IconUsers },
  { key: 'agents', label: 'Hermes Agents', icon: IconBot },
  { key: 'memory', label: 'Memory', icon: IconMemory },
  { key: 'providers', label: 'AI Providers', icon: IconProvider },
];

export default function Sidebar({ view, setView }: { view: View; setView: (v: View) => void }) {
  return (
    <aside className="sidebar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 10px 20px' }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'var(--accent)', color: 'var(--accent-contrast)', fontSize: 17 }}>🛸</div>
        <div style={{ fontWeight: 700, fontSize: 15.5, letterSpacing: '-0.01em' }}>Noonight</div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {NAV.map(({ key, label, icon: Icon }) => (
          <button key={key} className={`nav-item ${view === key ? 'active' : ''}`} onClick={() => setView(key)}>
            <Icon size={19} />
            {label}
          </button>
        ))}
      </nav>

      <div style={{ marginTop: 'auto', padding: '12px 10px 0' }}>
        <div className="card" style={{ padding: 14, background: 'var(--surface-2)', border: 'none' }}>
          <div style={{ fontSize: 12.5, fontWeight: 600 }}>Isolasi per-user</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4, lineHeight: 1.4 }}>
            Tiap user hanya mengakses repositori miliknya sendiri.
          </div>
        </div>
      </div>
    </aside>
  );
}
