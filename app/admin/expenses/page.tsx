'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Plus, Edit2, Trash2, Copy } from 'lucide-react';

const CATEGORIES = ['Salary', 'Rent', 'Utilities', 'Raw Material', 'Maintenance', 'Misc'];

interface Expense {
  _id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  note: string;
  recurring: boolean;
  createdBy: { name: string };
}

const EMPTY_FORM = { title: '', category: 'Misc', amount: '', date: new Date().toISOString().split('T')[0], note: '', recurring: false, frequency: 'monthly' };

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [filterCat, setFilterCat] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const load = async () => {
    const params = new URLSearchParams();
    if (filterCat !== 'all') params.append('category', filterCat);
    if (fromDate) params.append('from', fromDate);
    if (toDate) params.append('to', toDate);
    const r = await api.get(`/expenses?${params}`);
    setExpenses(r.data.expenses);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filterCat, fromDate, toDate]);

  const openNew = () => { setEditing(null); setForm({ ...EMPTY_FORM }); setShowForm(true); };
  const openEdit = (e: Expense) => {
    setEditing(e);
    setForm({ title: e.title, category: e.category, amount: String(e.amount), date: e.date.split('T')[0], note: e.note, recurring: e.recurring, frequency: 'monthly' });
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = { ...form, amount: Number(form.amount) };
      if (editing) await api.put(`/expenses/${editing._id}`, body);
      else await api.post('/expenses', body);
      setShowForm(false);
      load();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    await api.delete(`/expenses/${id}`);
    load();
  };

  const handleDuplicate = async (id: string) => {
    await api.post(`/expenses/${id}/duplicate`);
    load();
  };

  const totalShown = expenses.reduce((s, e) => s + e.amount, 0);

  const categoryColor: Record<string, string> = { Salary: 'badge-red', Rent: 'badge-gold', Utilities: 'badge-gray', 'Raw Material': 'badge-green', Maintenance: 'badge-gray', Misc: 'badge-gray' };

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Expenses</h1>
        <button id="add-expense-btn" onClick={openNew} className="btn btn-primary"><Plus size={16} /> Add Expense</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.2rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <select id="filter-cat" className="input" style={{ width: 'auto' }} value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
          <option value="all">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input id="filter-from" type="date" className="input" style={{ width: 'auto' }} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <input id="filter-to" type="date" className="input" style={{ width: 'auto' }} value={toDate} onChange={(e) => setToDate(e.target.value)} />
        {(fromDate || toDate || filterCat !== 'all') && (
          <button onClick={() => { setFilterCat('all'); setFromDate(''); setToDate(''); }} className="btn btn-ghost btn-sm">Clear</button>
        )}
      </div>

      {/* Total */}
      <div className="card" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#888' }}>Total shown</span>
        <span style={{ fontWeight: 800, fontSize: '1.3rem', color: '#e74c3c' }}>Rs. {totalShown.toLocaleString()}</span>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><span className="spinner" style={{ width: 36, height: 36 }} /></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Title</th><th>Category</th><th>Amount</th><th>Note</th><th>Added By</th><th>Actions</th></tr></thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e._id}>
                  <td style={{ color: '#888', fontSize: '0.8rem' }}>{new Date(e.date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td style={{ fontWeight: 600 }}>{e.title}{e.recurring && <span style={{ marginLeft: 6, fontSize: '0.7rem', color: '#2980b9' }}>↺ recurring</span>}</td>
                  <td><span className={`badge ${categoryColor[e.category] || 'badge-gray'}`}>{e.category}</span></td>
                  <td style={{ fontWeight: 700, color: '#e74c3c' }}>Rs. {e.amount.toLocaleString()}</td>
                  <td style={{ color: '#888', fontSize: '0.82rem' }}>{e.note || '—'}</td>
                  <td style={{ color: '#888', fontSize: '0.82rem' }}>{e.createdBy?.name || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      {e.recurring && <button id={`dup-${e._id}`} onClick={() => handleDuplicate(e._id)} className="btn btn-ghost btn-sm" title="Copy to next month"><Copy size={13} /></button>}
                      <button id={`edit-exp-${e._id}`} onClick={() => openEdit(e)} className="btn btn-ghost btn-sm"><Edit2 size={13} /></button>
                      <button id={`del-exp-${e._id}`} onClick={() => handleDelete(e._id)} className="btn btn-danger btn-sm"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: '#555', padding: '2rem' }}>No expenses found</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: 460, border: '1px solid #3a1010' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '1.2rem' }}>{editing ? 'Edit Expense' : 'New Expense'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <div>
                <label className="label">Title</label>
                <input id="exp-title" className="input" placeholder="e.g. Ali's Salary - July" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="grid-2">
                <div>
                  <label className="label">Category</label>
                  <select id="exp-category" className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Amount (Rs.)</label>
                  <input id="exp-amount" className="input" type="number" min={0} placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Date</label>
                <input id="exp-date" type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div>
                <label className="label">Note (optional)</label>
                <input id="exp-note" className="input" placeholder="Any additional detail" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#888', fontSize: '0.88rem' }}>
                <input id="exp-recurring" type="checkbox" checked={form.recurring} onChange={(e) => setForm({ ...form, recurring: e.target.checked })} />
                Recurring expense (monthly)
              </label>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.2rem' }}>
              <button id="save-expense-btn" onClick={handleSave} className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>
                {saving ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Save Expense'}
              </button>
              <button onClick={() => setShowForm(false)} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
