'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { LayoutDashboard, UtensilsCrossed, ReceiptText, BarChart3, Users, LogOut, MonitorSmartphone, Menu, X } from 'lucide-react';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/menu', label: 'Menu', icon: UtensilsCrossed },
  { href: '/admin/expenses', label: 'Expenses', icon: ReceiptText },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { href: '/admin/users', label: 'Staff', icon: Users },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'owner')) router.replace('/login');
  }, [user, loading, router]);

  // Automatically close sidebar when pathname changes on mobile
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (loading || !user) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><span className="spinner" style={{ width: 32, height: 32 }} /></div>;

  return (
    <div className="admin-layout">
      {/* Sidebar Overlay */}
      <div 
        className={`admin-sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <nav className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.6rem 1.5rem', borderBottom: '1px solid var(--border)', marginBottom: '1rem' }}>
          <div>
            <p style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--gold)' }}>🥢 Golden Wok</p>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 2 }}>Admin Panel</p>
          </div>
          <button 
            className="admin-sidebar-close-btn"
            onClick={() => setSidebarOpen(false)}
            style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}
          >
            <X size={20} />
          </button>
        </div>

        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link key={href} id={`nav-${label.toLowerCase()}`} href={href} style={{
              display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 0.8rem',
              borderRadius: 10, marginBottom: '0.2rem', textDecoration: 'none',
              fontWeight: 600, fontSize: '0.85rem',
              background: active ? 'var(--red)' : 'transparent',
              color: active ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.15s',
            }}>
              <Icon size={16} />
              {label}
            </Link>
          );
        })}

        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <Link href="/pos" id="nav-pos" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.55rem 0.8rem', borderRadius: 10, textDecoration: 'none', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            <MonitorSmartphone size={15} /> Go to POS
          </Link>
          <button id="nav-logout" onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.55rem 0.8rem', borderRadius: 10, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.82rem', width: '100%' }}>
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </nav>

      {/* Content wrapper */}
      <div className="admin-content">
        <header className="admin-mobile-header">
          <button 
            id="admin-sidebar-toggle"
            onClick={() => setSidebarOpen(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Menu size={22} />
          </button>
          <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--gold)', userSelect: 'none' }}>🥢 Golden Wok Admin</span>
        </header>

        <main style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
