import React, { useState } from 'react';
import { fetchWithAuth } from '../lib/api';
import { getHomeRouteForRole } from '../lib/routing';

const ROLES = [
  { key: 'landlord', label: 'Landlord', desc: 'Manage properties, rooms & tenants' },
  { key: 'tenant', label: 'Tenant', desc: 'Monitor usage & recharge wallet' },
  { key: 'homeowner', label: 'Homeowner', desc: 'Full house energy verification' },
  { key: 'installer', label: 'Installer / Agent', desc: 'Device registration & pairing' },
];

export default function SignupPage() {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole || !phone || !password || !fullName) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetchWithAuth('/api/v1/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          phone: phone.trim(),
          password,
          full_name: fullName.trim(),
          role: selectedRole
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Signup failed');
        return;
      }

      // Store tokens and redirect
      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', data.access_token);
        window.location.href = getHomeRouteForRole(data.role);
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: 'var(--sp-6) var(--sp-4)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div className="sc-glass-card" style={{ width: '100%', maxWidth: '540px', padding: 'var(--sp-6)' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 var(--sp-2) 0', color: 'var(--sc-text)' }}>
          Create your account
        </h1>
        <p style={{ color: 'var(--sc-text-muted)', marginBottom: 'var(--sp-6)' }}>
          What are you setting up?
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)', marginBottom: 'var(--sp-6)' }}>
          {ROLES.map((r) => (
            <div
              key={r.key}
              onClick={() => setSelectedRole(r.key)}
              style={{
                padding: 'var(--sp-4)',
                borderRadius: 'var(--r-md)',
                background: selectedRole === r.key ? 'rgba(46, 230, 168, 0.15)' : 'rgba(18, 38, 58, 0.6)',
                border: `1px solid ${selectedRole === r.key ? 'var(--sc-green)' : 'var(--glass-border-neutral)'}`,
                cursor: 'pointer',
                transition: 'all 200ms ease'
              }}
            >
              <div style={{ fontWeight: 600, color: selectedRole === r.key ? 'var(--sc-green)' : 'var(--sc-text)', marginBottom: '4px' }}>
                {r.label}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--sc-text-muted)' }}>
                {r.desc}
              </div>
            </div>
          ))}
        </div>

        {selectedRole && (
          <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--sc-text-muted)', display: 'block', marginBottom: '6px' }}>
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. John Doe"
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
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
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
              {loading ? 'Creating account...' : 'Complete Signup'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
