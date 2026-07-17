'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.username, form.password);
      router.replace('/pos');
    } catch {
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(ellipse at 50% 0%, #3a0808 0%, #0f0f0f 60%)' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        {/* Logo / Brand */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🥢</div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f0f0f0' }}>Golden Wok</h1>
          <p style={{ color: '#888', fontSize: '0.9rem', marginTop: '0.3rem' }}>POS & Restaurant Management</p>
        </div>

        <div className="card" style={{ border: '1px solid #3a1010' }}>
          <h2 style={{ fontWeight: 700, marginBottom: '1.5rem', fontSize: '1.1rem' }}>Sign In</h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="label">Username</label>
              <input
                id="username"
                className="input"
                placeholder="Enter username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                autoFocus
                required
              />
            </div>

            <div>
              <label className="label">Password</label>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="Enter password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>

            {error && (
              <p style={{ color: '#e74c3c', fontSize: '0.85rem', background: '#2a0808', padding: '0.6rem 0.8rem', borderRadius: 8, border: '1px solid #5a1010' }}>
                {error}
              </p>
            )}

            <button id="login-btn" type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: '0.5rem' }}>
              {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : 'Sign In'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: '#555', fontSize: '0.78rem', marginTop: '1.5rem' }}>
          Golden Wok © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
