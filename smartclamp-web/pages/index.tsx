import React, { useState } from 'react';
import { fetchWithAuth } from '../lib/api';

interface MeterValidationResult {
  valid: boolean;
  customer_name?: string;
  address?: string;
  disco_name?: string;
  provider_name?: string;
}

export default function HomePage() {
  const [meterNumber, setMeterNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MeterValidationResult | null>(null);

  // IR-Reader Order State
  const [orderedIr, setOrderedIr] = useState(false);

  const handleValidateMeter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meterNumber.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await fetchWithAuth('/api/v1/meters/validate', {
        method: 'POST',
        body: JSON.stringify({ meter_number: meterNumber.trim(), utility_type: 'electricity' }),
      });
      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error('Validation error:', err);
      setResult({ valid: false });
    } finally {
      setLoading(false);
    }
  };

  const handleOrderIrReader = async () => {
    if (!meterNumber) return;
    try {
      const res = await fetchWithAuth('/api/v1/meters/link', {
        method: 'POST',
        body: JSON.stringify({ meter_number: meterNumber, disco_name: result?.disco_name || 'EKEDC' })
      });
      if (res.ok) {
        setOrderedIr(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--sc-navy)', color: 'var(--sc-text)' }}>
      {/* Top Navigation Bar */}
      <nav style={{ padding: 'var(--sp-4) var(--sp-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border-neutral)', backdropFilter: 'blur(10px)' }}>
        <div style={{ fontSize: '24px', fontWeight: 700 }}>
          Smart<span style={{ color: 'var(--sc-green)' }}>Clamp</span>
        </div>
        <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
          <button onClick={() => window.location.href = '/login'} style={{ background: 'transparent', border: '1px solid var(--sc-slate)', color: 'var(--sc-text)', borderRadius: 'var(--r-pill)', padding: '8px 20px', cursor: 'pointer', fontWeight: 600 }}>Log In</button>
          <button onClick={() => window.location.href = '/signup'} className="sc-btn-primary" style={{ height: '40px', padding: '0 20px' }}>Sign Up</button>
        </div>
      </nav>

      {/* Hero Section */}
      <main style={{ padding: 'var(--sp-10) var(--sp-4)', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--sp-9)' }}>
          <h1 style={{ fontSize: '54px', fontWeight: 700, margin: '0 0 var(--sp-3) 0', letterSpacing: '-0.02em', lineHeight: '1.1' }}>
            Electricity you can verify, <br />
            <span style={{ color: 'var(--sc-green)' }}>with or without a meter.</span>
          </h1>
          <p style={{ color: 'var(--sc-text-muted)', fontSize: '20px', maxWidth: '640px', margin: '0 auto var(--sp-6) auto' }}>
            Verification layer for Nigerian tenants, landlords, homeowners, and DisCos. Precision hardware clamps & optical IR meter readers.
          </p>
        </div>

        {/* Meter Validation Box */}
        <div className="sc-glass-card" style={{ maxWidth: '520px', margin: '0 auto var(--sp-10) auto', padding: 'var(--sp-6)' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 600, marginTop: 0, marginBottom: 'var(--sp-4)' }}>
            Instant Meter & Customer Lookup
          </h2>

          <form onSubmit={handleValidateMeter} style={{ display: 'flex', gap: 'var(--sp-3)', flexDirection: 'column' }}>
            <label style={{ fontSize: '14px', color: 'var(--sc-text-muted)' }} htmlFor="meter-input">
              Enter DisCo meter number
            </label>
            <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
              <input
                id="meter-input"
                type="text"
                value={meterNumber}
                onChange={(e) => setMeterNumber(e.target.value)}
                placeholder="e.g. 0123456789"
                style={{
                  flex: 1,
                  height: '48px',
                  borderRadius: 'var(--r-pill)',
                  background: 'rgba(11, 27, 43, 0.6)',
                  border: '1px solid var(--sc-slate)',
                  color: 'var(--sc-text)',
                  padding: '0 var(--sp-4)',
                  fontSize: '16px',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                className="sc-btn-primary"
                disabled={loading}
              >
                {loading ? 'Checking...' : 'Check'}
              </button>
            </div>
          </form>

          {result && (
            <div style={{ marginTop: 'var(--sp-6)' }}>
              {result.valid ? (
                <div style={{ background: 'rgba(46, 230, 168, 0.1)', border: '1px solid var(--sc-green)', borderRadius: 'var(--r-md)', padding: 'var(--sp-5)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-2)' }}>
                    <span className="sc-verified-dot" />
                    <span style={{ fontWeight: 600, color: 'var(--sc-green)' }}>Verified Customer Record</span>
                  </div>
                  <div style={{ fontSize: '15px', lineHeight: '1.6' }}>
                    <strong>Customer:</strong> {result.customer_name}<br />
                    <strong>Address:</strong> {result.address}<br />
                    <strong>DisCo:</strong> {result.disco_name}
                  </div>

                  {!orderedIr ? (
                    <button onClick={handleOrderIrReader} className="sc-btn-primary" style={{ width: '100%', marginTop: 'var(--sp-4)', height: '42px', fontSize: '14px' }}>
                      Order Optical IR-Reader for Live Balance
                    </button>
                  ) : (
                    <div style={{ marginTop: 'var(--sp-3)', fontSize: '13px', color: 'var(--sc-green)', fontWeight: 600 }}>
                      ✓ IR-Reader order linked to meter {meterNumber}! Shipping dispatch initiated.
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ background: 'rgba(255, 107, 107, 0.1)', border: '1px solid var(--sc-alert)', borderRadius: 'var(--r-md)', padding: 'var(--sp-4)', color: 'var(--sc-alert)', fontWeight: 600 }}>
                  Meter number not found or unreachable.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Subscription Pricing Matrix */}
        <section style={{ marginTop: 'var(--sp-10)' }}>
          <h2 style={{ textAlign: 'center', fontSize: '32px', marginBottom: 'var(--sp-8)' }}>Subscription Tiers</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 'var(--sp-4)' }}>
            <div className="sc-glass-card" style={{ padding: 'var(--sp-5)' }}>
              <h3 style={{ marginTop: 0 }}>Free</h3>
              <div className="font-mono-data" style={{ fontSize: '28px', color: 'var(--sc-green)' }}>₦0</div>
              <p style={{ fontSize: '13px', color: 'var(--sc-text-muted)', lineHeight: '1.6', marginTop: 'var(--sp-3)' }}>
                Basic meter validation, room invites & prepaid wallet.
              </p>
            </div>

            <div className="sc-glass-card" style={{ padding: 'var(--sp-5)' }}>
              <h3 style={{ marginTop: 0 }}>Basic</h3>
              <div className="font-mono-data" style={{ fontSize: '28px', color: 'var(--sc-green)' }}>₦1,500/mo</div>
              <p style={{ fontSize: '13px', color: 'var(--sc-text-muted)', lineHeight: '1.6', marginTop: 'var(--sp-3)' }}>
                Continuous live watts counter & outage alerts.
              </p>
            </div>

            <div className="sc-glass-card" style={{ padding: 'var(--sp-5)', borderColor: 'var(--sc-green)' }}>
              <h3 style={{ marginTop: 0, color: 'var(--sc-green)' }}>Basic Pro</h3>
              <div className="font-mono-data" style={{ fontSize: '28px', color: 'var(--sc-green-bright)' }}>₦3,500/mo</div>
              <p style={{ fontSize: '13px', color: 'var(--sc-text-muted)', lineHeight: '1.6', marginTop: 'var(--sp-3)' }}>
                Appliance load signatures, power factor, outage credit & bill forecast.
              </p>
            </div>

            <div className="sc-glass-card" style={{ padding: 'var(--sp-5)' }}>
              <h3 style={{ marginTop: 0 }}>Pro</h3>
              <div className="font-mono-data" style={{ fontSize: '28px', color: 'var(--sc-green)' }}>Custom</div>
              <p style={{ fontSize: '13px', color: 'var(--sc-text-muted)', lineHeight: '1.6', marginTop: 'var(--sp-3)' }}>
                Full remote relay power switch, step-up OTP controls & portfolio analytics.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
