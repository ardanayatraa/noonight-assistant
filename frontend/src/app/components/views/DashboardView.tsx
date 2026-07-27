'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, Client } from '../../lib/api';
import { IconUsers, IconRepo, IconBot, IconCheck, IconChat } from '../../lib/icons';

function Stat({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <div className="card stat">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="stat-label">{label}</div>
          <div className="stat-value">{value}</div>
        </div>
        <div className="stat-icon">{icon}</div>
      </div>
    </div>
  );
}

export default function DashboardView() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Client[]>('clients').then((c) => { setClients(c || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const totalRepos = clients.reduce((n, c) => n + (c.projects?.length || 0), 0);
  const activeAgents = clients.filter((c) => c.agent?.isActive).length;
  const requestsUsed = clients.reduce((n, c) => n + (c.requestsUsed || 0), 0);
  const balanceLeft = clients.reduce((n, c) => n + (c.requestBalance || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="stat-grid">
        <Stat label="Total Users" value={loading ? '—' : clients.length} icon={<IconUsers size={20} />} />
        <Stat label="Repositori" value={loading ? '—' : totalRepos} icon={<IconRepo size={20} />} />
        <Stat label="Agen Aktif" value={loading ? '—' : activeAgents} icon={<IconBot size={20} />} />
        <Stat label="Request Terpakai" value={loading ? '—' : requestsUsed} icon={<IconChat size={20} />} />
        <Stat label="Sisa Saldo (total)" value={loading ? '—' : balanceLeft} icon={<IconCheck size={20} />} />
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
          <h3 style={{ fontSize: 15.5 }}>User Terbaru</h3>
          <button className="btn btn-sm btn-subtle" onClick={() => router.push('/users')}>Kelola user</button>
        </div>
        <hr className="divider" />
        {loading ? (
          <div className="empty"><span className="spinner" /></div>
        ) : clients.length === 0 ? (
          <div className="empty">Belum ada user. Tambahkan user pertama Anda.</div>
        ) : (
          clients.slice(0, 6).map((c) => (
            <div className="row" key={c.uuid}>
              <div className="avatar">{c.name.slice(0, 1).toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{c.name}</div>
                <div className="muted" style={{ fontSize: 13 }}>{c.company || 'Tanpa perusahaan'} · {c.whatsappNumber}</div>
              </div>
              <span className="badge badge-accent">{c.projects?.length || 0} repo</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
