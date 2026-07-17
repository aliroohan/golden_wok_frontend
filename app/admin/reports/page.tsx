'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

interface Stats { totalSales: number; orderCount: number; avgOrderValue: number; byType: Record<string, number>; }
interface PLData { totalSales: number; totalExpenses: number; netProfit: number; expensesByCategory: Record<string, number>; }

export default function ReportsPage() {
  const today = new Date().toISOString().split('T')[0];
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; });
  const [to, setTo] = useState(today);
  const [pl, setPL] = useState<PLData | null>(null);
  const [daily, setDaily] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);

  const loadReports = async () => {
    setLoading(true);
    try {
      const [plR, dailyR] = await Promise.all([
        api.get(`/reports/profit-loss?from=${from}&to=${to}`),
        api.get(`/reports/daily?date=${today}`),
      ]);
      setPL(plR.data);
      setDaily(dailyR.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadReports(); }, [from, to]);

  const exportCSV = (type: string) => {
    window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/reports/export/csv?type=${type}&from=${from}&to=${to}`, '_blank');
  };

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Reports</h1>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button id="export-orders-csv" onClick={() => exportCSV('orders')} className="btn btn-ghost btn-sm">↓ Orders CSV</button>
          <button id="export-expenses-csv" onClick={() => exportCSV('expenses')} className="btn btn-ghost btn-sm">↓ Expenses CSV</button>
        </div>
      </div>

      {/* Date range selector */}
      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <label className="label" style={{ margin: 0 }}>From</label>
        <input id="report-from" type="date" className="input" style={{ width: 'auto' }} value={from} onChange={(e) => setFrom(e.target.value)} />
        <label className="label" style={{ margin: 0 }}>To</label>
        <input id="report-to" type="date" className="input" style={{ width: 'auto' }} value={to} onChange={(e) => setTo(e.target.value)} />
        <button onClick={loadReports} className="btn btn-primary btn-sm">Apply</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><span className="spinner" style={{ width: 36, height: 36 }} /></div>
      ) : (
        <>
          {/* Today quick stats */}
          {daily && (
            <div className="grid-4" style={{ marginBottom: '1.2rem' }}>
              {[
                { label: "Today's Sales", value: `Rs. ${daily.totalSales.toLocaleString()}`, color: '#f39c12' },
                { label: 'Orders Today', value: daily.orderCount, color: '#2980b9' },
                { label: 'Avg Order', value: `Rs. ${Math.round(daily.avgOrderValue).toLocaleString()}`, color: '#27ae60' },
                { label: 'Dine-in', value: `Rs. ${(daily.byType['dine-in'] || 0).toLocaleString()}`, color: '#8e44ad' },
              ].map(({ label, value, color }) => (
                <div key={label} className="stat-card">
                  <p className="stat-label">{label}</p>
                  <p className="stat-value" style={{ color, fontSize: '1.5rem' }}>{value}</p>
                </div>
              ))}
            </div>
          )}

          {/* P&L */}
          {pl && (
            <div className="grid-3" style={{ marginBottom: '1.2rem' }}>
              <div className="stat-card">
                <p className="stat-label">Total Sales</p>
                <p className="stat-value" style={{ color: '#f39c12' }}>Rs. {pl.totalSales.toLocaleString()}</p>
                <p className="stat-sub">{from} → {to}</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">Total Expenses</p>
                <p className="stat-value" style={{ color: '#e74c3c' }}>Rs. {pl.totalExpenses.toLocaleString()}</p>
              </div>
              <div className="stat-card" style={{ borderColor: pl.netProfit >= 0 ? '#1a5e1a' : '#5e1a1a' }}>
                <p className="stat-label">Net Profit</p>
                <p className="stat-value" style={{ color: pl.netProfit >= 0 ? '#27ae60' : '#e74c3c' }}>
                  Rs. {pl.netProfit.toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {/* Expenses by category */}
          {pl && Object.keys(pl.expensesByCategory).length > 0 && (
            <div className="card">
              <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>Expenses Breakdown</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {Object.entries(pl.expensesByCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => {
                  const pct = pl.totalExpenses > 0 ? (amt / pl.totalExpenses) * 100 : 0;
                  return (
                    <div key={cat}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.85rem' }}>
                        <span style={{ color: '#888' }}>{cat}</span>
                        <span style={{ fontWeight: 600 }}>Rs. {amt.toLocaleString()} <span style={{ color: '#555' }}>({pct.toFixed(1)}%)</span></span>
                      </div>
                      <div style={{ background: '#242424', borderRadius: 4, height: 6 }}>
                        <div style={{ background: '#e74c3c', borderRadius: 4, height: 6, width: `${pct}%`, transition: 'width 0.5s ease' }} />
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
