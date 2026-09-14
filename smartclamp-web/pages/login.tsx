import React, { useState } from 'react';
import { fetchWithAuth, fetchActiveFeatureFlags } from '../lib/api';
import { getHomeRouteForRole } from '../lib/routing';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetchWithAuth('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ phone: phone.trim(), password })
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', data.access_token);
        // Fetch feature flags in same sequence
        await fetchActiveFeatureFlags();
        window.location.href = getHomeRouteForRole(data.role);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: 'var(--sp-6) var(--sp-4)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div className="sc-glass-card" style={{ width: '100%', maxWidth: '420px', padding: 'var(--sp-6)' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 var(--sp-2) 0', color: 'var(--sc-text)' }}>
          Welcome back
        </h1>
        <p style={{ color: 'var(--sc-text-muted)', marginBottom: 'var(--sp-6)' }}>
          Log in to your SmartClamp account
        </p>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <div>
            <label style={{ fontSize: '13px', color: 'var(--sc-text-muted)', display: 'block', marginBottom: '6px' }}>
              Phone Number
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+2348012345678"
              style={{
                width: '100%',
                height: '48px',
                borderRadius: 'var(--r-pill)',
                background: 'rgba(11, 27, 43, 0.6)',
                border: '1px solid var(--sc-slate)',
                color: 'var(--sc-text)',
                padding: '0 var(--sp-4)',
                fontSize: '15px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '13px', color: 'var(--sc-text-muted)', display: 'block', marginBottom: '6px' }}>
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              style={{
                width: '100%',
                height: '48px',
                borderRadius: 'var(--r-pill)',
                background: 'rgba(11, 27, 43, 0.6)',
                border: '1px solid var(--sc-slate)',
                color: 'var(--sc-text)',
                padding: '0 var(--sp-4)',
                fontSize: '15px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {error && (
            <div style={{ color: 'var(--sc-alert)', fontSize: '14px', fontWeight: 500 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="sc-btn-primary"
            disabled={loading}
            style={{ marginTop: 'var(--sp-2)' }}
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>
      </div>
    </div>
  );
}
