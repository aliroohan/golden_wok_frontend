'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { TrendingUp, ShoppingBag, Receipt, DollarSign, Calendar } from 'lucide-react';

interface DailyStats {
  totalSales: number;
  orderCount: number;
  avgOrderValue: number;
  byType: Record<string, number>;
}

interface TopItem {
  name: string;
  variantLabel: string;
  totalQty: number;
  totalRevenue: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [weeklySales, setWeeklySales] = useState<number>(0);
  const [monthlySales, setMonthlySales] = useState<number>(0);
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [loading, setLoading] = useState(true);

  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const today = formatDate(new Date());

  useEffect(() => {
    setLoading(true);
    const todayDate = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(todayDate.getDate() - 6);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(todayDate.getDate() - 29);

    const todayStr = formatDate(todayDate);
    const sevenDaysAgoStr = formatDate(sevenDaysAgo);
    const thirtyDaysAgoStr = formatDate(thirtyDaysAgo);

    Promise.all([
      api.get(`/reports/daily?date=${todayStr}`).then((r) => r.data),
      api.get(`/reports/range?from=${sevenDaysAgoStr}&to=${todayStr}`).then((r) => r.data),
      api.get(`/reports/range?from=${thirtyDaysAgoStr}&to=${todayStr}`).then((r) => r.data),
      api.get('/reports/top-items?limit=50').then((r) => r.data),
    ])
      .then(([dailyData, weeklyData, monthlyData, topItemsData]) => {
        setStats(dailyData);
        setWeeklySales(weeklyData.totalSales || 0);
        setMonthlySales(monthlyData.totalSales || 0);
        setTopItems(topItemsData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [today]);

  const statCards = stats ? [
    { label: "Today's Sales", value: `Rs. ${stats.totalSales.toLocaleString()}`, icon: DollarSign, color: '#f39c12' },
    { label: "Weekly Sales (7d)", value: `Rs. ${weeklySales.toLocaleString()}`, icon: Calendar, color: '#2ecc71' },
    { label: "Monthly Sales (30d)", value: `Rs. ${monthlySales.toLocaleString()}`, icon: TrendingUp, color: '#3498db' },
    { label: 'Orders (Today)', value: stats.orderCount, icon: ShoppingBag, color: '#95a5a6' },
    { label: 'Avg Order Value', value: `Rs. ${Math.round(stats.avgOrderValue).toLocaleString()}`, icon: DollarSign, color: '#1abc9c' },
    { label: 'Dine-in Sales', value: `Rs. ${(stats.byType['dine-in'] || 0).toLocaleString()}`, icon: Receipt, color: '#8e44ad' },
  ] : [];

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ margin: 0, color: 'var(--text)' }}>Dashboard</h1>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          {new Date().toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><span className="spinner" style={{ width: 36, height: 36 }} /></div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {statCards.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="stat-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p className="stat-label">{label}</p>
                    <p className="stat-value" style={{ color }}>{value}</p>
                  </div>
                  <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '0.5rem', border: '1px solid var(--border)' }}>
                    <Icon size={20} color={color} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order type breakdown */}
          {stats && (
            <div className="card">
              <h3 style={{ fontWeight: 700, marginBottom: '1rem', color: 'var(--text)' }}>Sales by Order Type</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {['dine-in', 'takeaway', 'delivery'].map((t) => {
                  const val = stats.byType[t] || 0;
                  const pct = stats.totalSales > 0 ? (val / stats.totalSales) * 100 : 0;
                  return (
                    <div key={t}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.85rem' }}>
                        <span style={{ textTransform: 'capitalize', color: 'var(--text-muted)' }}>{t}</span>
                        <span style={{ fontWeight: 600, color: 'var(--text)' }}>Rs. {val.toLocaleString()} <span style={{ color: 'var(--text-dim)' }}>({pct.toFixed(1)}%)</span></span>
                      </div>
                      <div style={{ background: 'var(--surface-3)', borderRadius: 4, height: 6 }}>
                        <div style={{ background: 'var(--red)', borderRadius: 4, height: 6, width: `${pct}%`, transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Top Selling Items & Deals */}
          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
              {/* Top Items */}
              <div className="card">
                <h3 style={{ fontWeight: 700, marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text)' }}>
                  🔥 Top Selling Items
                </h3>
                {topItems.filter(item => !item.name.toLowerCase().includes('deal')).length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '1rem' }}>No data available</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    {topItems
                      .filter(item => !item.name.toLowerCase().includes('deal'))
                      .slice(0, 5)
                      .map((item, idx) => (
                        <div key={`${item.name}-${item.variantLabel}`} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--gold)', minWidth: 24 }}>#{idx + 1}</span>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)' }}>{item.name}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Size: {item.variantLabel} · {item.totalQty} sold</p>
                          </div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--gold)' }}>
                            Rs. {item.totalRevenue.toLocaleString()}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Top Deals */}
              <div className="card">
                <h3 style={{ fontWeight: 700, marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text)' }}>
                  ✨ Top Selling Deals
                </h3>
                {topItems.filter(item => item.name.toLowerCase().includes('deal')).length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '1rem' }}>No deals sold yet</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    {topItems
                      .filter(item => item.name.toLowerCase().includes('deal'))
                      .slice(0, 5)
                      .map((item, idx) => (
                        <div key={`${item.name}-${item.variantLabel}`} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--success)', minWidth: 24 }}>#{idx + 1}</span>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)' }}>{item.name}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Size: {item.variantLabel} · {item.totalQty} sold</p>
                          </div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--success)' }}>
                            Rs. {item.totalRevenue.toLocaleString()}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
