'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  IconDashboard,
  IconUsers,
  IconBot,
  IconMemory,
  IconProvider,
  IconWhatsApp,
  IconLogo,
} from '../lib/icons';

export const NAV: { href: string; label: string; icon: (p: any) => JSX.Element }[] = [
  { href: '/dashboard', label: 'Dashboard', icon: IconDashboard },
  { href: '/users', label: 'Users & Repos', icon: IconUsers },
  { href: '/agents', label: 'Hermes Agents', icon: IconBot },
  { href: '/memory', label: 'Memory', icon: IconMemory },
  { href: '/whatsapp', label: 'WhatsApp', icon: IconWhatsApp },
  { href: '/providers', label: 'AI Providers', icon: IconProvider },
];

export default function Sidebar() {
  const pathname = usePathname() ?? '';
  return (
    <aside className="sidebar">
      <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 10px 20px' }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'var(--accent)', color: 'var(--accent-contrast)' }}>
          <IconLogo size={19} />
        </div>
        <div style={{ fontWeight: 700, fontSize: 15.5, letterSpacing: '-0.01em' }}>Noonight</div>
      </Link>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link key={href} href={href} className={`nav-item ${active ? 'active' : ''}`}>
              <Icon size={19} />
              {label}
            </Link>
          );
        })}
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
