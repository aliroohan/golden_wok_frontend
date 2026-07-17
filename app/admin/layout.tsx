'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';
import { LayoutDashboard, UtensilsCrossed, ReceiptText, BarChart3, Users, LogOut, Tag, MonitorSmartphone } from 'lucide-react';

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

  useEffect(() => {
    if (!loading && (!user || user.role !== 'owner')) router.replace('/login');
  }, [user, loading, router]);

  if (loading || !user) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><span className="spinner" style={{ width: 32, height: 32 }} /></div>;

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0f0f0f' }}>
      {/* Sidebar */}
      <nav style={{ width: 200, flexShrink: 0, background: '#141414', borderRight: '1px solid #242424', display: 'flex', flexDirection: 'column', padding: '1rem 0.6rem' }}>
        <div style={{ padding: '0.5rem 0.6rem 1.5rem', borderBottom: '1px solid #2a2a2a', marginBottom: '1rem' }}>
          <p style={{ fontWeight: 800, fontSize: '1rem', color: '#f39c12' }}>🥢 Golden Wok</p>
          <p style={{ fontSize: '0.72rem', color: '#555', marginTop: 2 }}>Admin Panel</p>
        </div>

        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link key={href} id={`nav-${label.toLowerCase()}`} href={href} style={{
              display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 0.8rem',
              borderRadius: 10, marginBottom: '0.2rem', textDecoration: 'none',
              fontWeight: 600, fontSize: '0.85rem',
              background: active ? '#c0392b' : 'transparent',
              color: active ? '#fff' : '#888',
              transition: 'all 0.15s',
            }}>
              <Icon size={16} />
              {label}
            </Link>
          );
        })}

        <div style={{ marginTop: 'auto', borderTop: '1px solid #2a2a2a', paddingTop: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <Link href="/pos" id="nav-pos" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.55rem 0.8rem', borderRadius: 10, textDecoration: 'none', color: '#888', fontSize: '0.82rem' }}>
            <MonitorSmartphone size={15} /> Go to POS
          </Link>
          <button id="nav-logout" onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.55rem 0.8rem', borderRadius: 10, background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '0.82rem', width: '100%' }}>
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </nav>

      {/* Content */}
      <main style={{ flex: 1, overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
