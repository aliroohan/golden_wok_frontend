'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { TrendingUp, ShoppingBag, Receipt, DollarSign } from 'lucide-react';

interface DailyStats {
  totalSales: number;
  orderCount: number;
  avgOrderValue: number;
  byType: Record<string, number>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    api.get(`/reports/daily?date=${today}`)
      .then((r) => setStats(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [today]);

  const statCards = stats ? [
    { label: "Today's Sales", value: `Rs. ${stats.totalSales.toLocaleString()}`, icon: DollarSign, color: '#f39c12' },
    { label: 'Orders', value: stats.orderCount, icon: ShoppingBag, color: '#2980b9' },
    { label: 'Avg Order Value', value: `Rs. ${Math.round(stats.avgOrderValue).toLocaleString()}`, icon: TrendingUp, color: '#27ae60' },
    { label: 'Dine-in Sales', value: `Rs. ${(stats.byType['dine-in'] || 0).toLocaleString()}`, icon: Receipt, color: '#8e44ad' },
  ] : [];

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Dashboard</h1>
        <span style={{ color: '#888', fontSize: '0.85rem' }}>
          {new Date().toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><span className="spinner" style={{ width: 36, height: 36 }} /></div>
      ) : (
        <>
          <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
            {statCards.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="stat-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p className="stat-label">{label}</p>
                    <p className="stat-value" style={{ color }}>{value}</p>
                  </div>
                  <div style={{ background: '#242424', borderRadius: 10, padding: '0.5rem' }}>
                    <Icon size={20} color={color} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order type breakdown */}
          {stats && (
            <div className="card">
              <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Sales by Order Type</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {['dine-in', 'takeaway', 'delivery'].map((t) => {
                  const val = stats.byType[t] || 0;
                  const pct = stats.totalSales > 0 ? (val / stats.totalSales) * 100 : 0;
                  return (
                    <div key={t}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.85rem' }}>
                        <span style={{ textTransform: 'capitalize', color: '#888' }}>{t}</span>
                        <span style={{ fontWeight: 600 }}>Rs. {val.toLocaleString()} <span style={{ color: '#555' }}>({pct.toFixed(1)}%)</span></span>
                      </div>
                      <div style={{ background: '#242424', borderRadius: 4, height: 6 }}>
                        <div style={{ background: '#c0392b', borderRadius: 4, height: 6, width: `${pct}%`, transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
