'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Plus, Edit2, UserCheck, UserX } from 'lucide-react';

interface User { _id: string; name: string; username: string; role: string; active: boolean; createdAt: string; }

const EMPTY_FORM = { name: '', username: '', password: '', role: 'cashier', adminPin: '' };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const r = await api.get('/users');
    setUsers(r.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ ...EMPTY_FORM }); setShowForm(true); };
  const openEdit = (u: User) => {
    setEditing(u);
    setForm({ name: u.name, username: u.username, password: '', role: u.role, adminPin: '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: Record<string, string | boolean> = { name: form.name, role: form.role };
      if (form.password) body.password = form.password;
      if (form.adminPin) body.adminPin = form.adminPin;
      if (!editing) { body.username = form.username; body.password = form.password; }

      if (editing) await api.put(`/users/${editing._id}`, body);
      else await api.post('/users', body);
      setShowForm(false);
      load();
    } finally { setSaving(false); }
  };

  const toggleActive = async (u: User) => {
    await api.put(`/users/${u._id}`, { active: !u.active });
    load();
  };

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Staff Accounts</h1>
        <button id="add-user-btn" onClick={openNew} className="btn btn-primary"><Plus size={16} /> Add Cashier</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><span className="spinner" style={{ width: 36, height: 36 }} /></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td style={{ fontWeight: 600 }}>{u.name}</td>
                  <td style={{ color: '#888' }}>@{u.username}</td>
                  <td><span className={`badge ${u.role === 'owner' ? 'badge-gold' : 'badge-gray'}`}>{u.role}</span></td>
                  <td><span className={`badge ${u.active ? 'badge-green' : 'badge-red'}`}>{u.active ? 'Active' : 'Deactivated'}</span></td>
                  <td style={{ color: '#888', fontSize: '0.8rem' }}>{new Date(u.createdAt).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button id={`toggle-user-${u._id}`} onClick={() => toggleActive(u)} className="btn btn-ghost btn-sm" title={u.active ? 'Deactivate' : 'Activate'}>
                        {u.active ? <UserX size={14} /> : <UserCheck size={14} />}
                      </button>
                      <button id={`edit-user-${u._id}`} onClick={() => openEdit(u)} className="btn btn-ghost btn-sm"><Edit2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: 420, border: '1px solid #3a1010' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '1.2rem' }}>{editing ? 'Edit Staff' : 'New Cashier Account'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <div>
                <label className="label">Full Name</label>
                <input id="user-name" className="input" placeholder="e.g. Ali Khan" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              {!editing && (
                <div>
                  <label className="label">Username</label>
                  <input id="user-username" className="input" placeholder="e.g. ali.cashier" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
                </div>
              )}
              <div>
                <label className="label">{editing ? 'New Password (leave blank to keep)' : 'Password'}</label>
                <input id="user-password" type="password" className="input" placeholder="Min 6 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              {form.role === 'owner' && (
                <div>
                  <label className="label">Admin PIN (4 digits, for void/refund)</label>
                  <input id="user-pin" type="password" className="input" maxLength={4} placeholder="4-digit PIN" value={form.adminPin} onChange={(e) => setForm({ ...form, adminPin: e.target.value })} />
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.2rem' }}>
              <button id="save-user-btn" onClick={handleSave} className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>
                {saving ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Save'}
              </button>
              <button onClick={() => setShowForm(false)} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
