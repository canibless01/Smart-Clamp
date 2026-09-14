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

  return (
    <div style={{ minHeight: '100vh', padding: 'var(--sp-6) var(--sp-4)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <header style={{ marginBottom: 'var(--sp-8)', textAlign: 'center' }}>
        <h1 style={{ fontSize: '40px', fontWeight: 700, margin: 0, color: 'var(--sc-text)' }}>
          Smart<span style={{ color: 'var(--sc-green)' }}>Clamp</span>
        </h1>
        <p style={{ color: 'var(--sc-text-muted)', fontSize: '18px', marginTop: 'var(--sp-2)' }}>
          Electricity you can verify, with or without a meter.
        </p>
      </header>

      <div className="sc-glass-card" style={{ width: '100%', maxWidth: '480px', padding: 'var(--sp-6)' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 600, marginTop: 0, marginBottom: 'var(--sp-4)', color: 'var(--sc-text)' }}>
          Verify Meter Number
        </h2>

        <form onSubmit={handleValidateMeter} style={{ display: 'flex', gap: 'var(--sp-3)', flexDirection: 'column' }}>
          <label style={{ fontSize: '14px', color: 'var(--sc-text-muted)' }} htmlFor="meter-input">
            Enter your meter number
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
              style={{ opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Checking...' : 'Check'}
            </button>
          </div>
        </form>

        {result && (
          <div style={{ marginTop: 'var(--sp-6)' }}>
            {result.valid ? (
              <div style={{
                background: 'rgba(46, 230, 168, 0.1)',
                border: '1px solid var(--sc-green)',
                borderRadius: 'var(--r-md)',
                padding: 'var(--sp-4)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-2)' }}>
                  <span className="sc-verified-dot" />
                  <span style={{ fontWeight: 600, color: 'var(--sc-green)' }}>Verified Meter</span>
                </div>
                <div style={{ fontSize: '15px', color: 'var(--sc-text)' }}>
                  <strong>Customer:</strong> {result.customer_name}<br />
                  <strong>Address:</strong> {result.address}<br />
                  <strong>DisCo:</strong> {result.disco_name}
                </div>
              </div>
            ) : (
              <div style={{
                background: 'rgba(255, 107, 107, 0.1)',
                border: '1px solid var(--sc-alert)',
                borderRadius: 'var(--r-md)',
                padding: 'var(--sp-4)',
                color: 'var(--sc-alert)',
                fontWeight: 600
              }}>
                Meter number not found or invalid.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
