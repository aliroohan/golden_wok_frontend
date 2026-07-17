'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

interface Stats { totalSales: number; orderCount: number; avgOrderValue: number; byType: Record<string, number>; }
interface PLData { totalSales: number; totalExpenses: number; netProfit: number; expensesByCategory: Record<string, number>; }
interface ProductSale { name: string; variantLabel: string; totalQty: number; totalRevenue: number; }

export default function ReportsPage() {
  const today = new Date().toISOString().split('T')[0];
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; });
  const [to, setTo] = useState(today);
  const [pl, setPL] = useState<PLData | null>(null);
  const [daily, setDaily] = useState<Stats | null>(null);
  const [productSales, setProductSales] = useState<ProductSale[]>([]);
  const [loading, setLoading] = useState(false);

  const loadReports = async () => {
    setLoading(true);
    try {
      const [plR, dailyR, itemsR] = await Promise.all([
        api.get(`/reports/profit-loss?from=${from}&to=${to}`),
        api.get(`/reports/daily?date=${today}`),
        api.get(`/reports/top-items?from=${from}&to=${to}&limit=100`),
      ]);
      setPL(plR.data);
      setDaily(dailyR.data);
      setProductSales(itemsR.data);
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
            <div className="card" style={{ marginBottom: '1.2rem' }}>
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

          {/* Detailed Product Sales List */}
          {productSales && (
            <div className="card" style={{ marginBottom: '1.2rem' }}>
              <h3 style={{ fontWeight: 700, marginBottom: '1.2rem' }}>Detailed Product Sales</h3>
              {productSales.length === 0 ? (
                <p style={{ color: '#555', fontSize: '0.9rem', textAlign: 'center', padding: '1.5rem' }}>
                  No product sales recorded in this date range.
                </p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #2a2a2a', color: '#888' }}>
                        <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Product Name</th>
                        <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Size / Variant</th>
                        <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, textAlign: 'right' }}>Qty Sold</th>
                        <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, textAlign: 'right' }}>Total Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productSales.map((item, idx) => (
                        <tr
                          key={`${item.name}-${item.variantLabel}-${idx}`}
                          style={{ borderBottom: '1px solid #1f1f1f' }}
                        >
                          <td style={{ padding: '0.75rem 0.5rem', fontWeight: 500, color: '#f0f0f0' }}>{item.name}</td>
                          <td style={{ padding: '0.75rem 0.5rem', color: '#aaa' }}>{item.variantLabel || '-'}</td>
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 600, color: '#27ae60' }}>
                            {item.totalQty.toLocaleString()}
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 700, color: '#f39c12' }}>
                            Rs. {item.totalRevenue.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
