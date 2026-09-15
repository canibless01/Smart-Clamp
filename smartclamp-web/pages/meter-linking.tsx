import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { fetchWithAuth } from '../lib/api';

export default function MeterLinkingPage() {
  const [meterNumber, setMeterNumber] = useState('');
  const [disco, setDisco] = useState('EKEDC');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLinkMeter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meterNumber.trim()) return;
    setLoading(true);

    try {
      const response = await fetchWithAuth('/api/v1/meters/link', {
        method: 'POST',
        body: JSON.stringify({ meter_number: meterNumber.trim(), disco_name: disco, utility_type: 'electricity' })
      });
      const data = await response.json();
      if (response.ok) {
        setStatus(`Meter ${meterNumber} linked successfully with status: ${data.status}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--sc-navy)', color: 'var(--sc-text)' }}>
      <Navbar />

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: 'var(--sp-8) var(--sp-4)' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: 'var(--sp-6)' }}>
          Meter Linking Flow
        </h1>

        <div className="sc-glass-card" style={{ padding: 'var(--sp-6)' }}>
          <p style={{ color: 'var(--sc-text-muted)', fontSize: '14px', marginBottom: 'var(--sp-6)' }}>
            Link a 3rd party smart meter for read-only integration, dual-tariff billing, or clamp cross-checking.
          </p>

          <form onSubmit={handleLinkMeter} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--sc-text-muted)', display: 'block', marginBottom: '6px' }}>Smart Meter Number</label>
              <input
                type="text"
                required
                value={meterNumber}
                onChange={(e) => setMeterNumber(e.target.value)}
                placeholder="e.g. 0123456789"
                style={{ width: '100%', height: '48px', borderRadius: 'var(--r-pill)', background: 'rgba(11,27,43,0.8)', border: '1px solid var(--sc-slate)', color: 'var(--sc-text)', padding: '0 var(--sp-4)', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '13px', color: 'var(--sc-text-muted)', display: 'block', marginBottom: '6px' }}>DisCo Utility</label>
              <select
                value={disco}
                onChange={(e) => setDisco(e.target.value)}
                style={{ width: '100%', height: '48px', borderRadius: 'var(--r-pill)', background: 'rgba(11,27,43,0.8)', border: '1px solid var(--sc-slate)', color: 'var(--sc-text)', padding: '0 var(--sp-4)' }}
              >
                <option value="EKEDC">EKEDC</option>
                <option value="IKEDC">IKEDC</option>
                <option value="AEDC">AEDC</option>
                <option value="IBEDC">IBEDC</option>
              </select>
            </div>

            {status && (
              <div style={{ color: 'var(--sc-green)', fontWeight: 600, fontSize: '14px' }}>
                {status}
              </div>
            )}

            <button type="submit" className="sc-btn-primary" disabled={loading}>
              {loading ? 'Linking Meter...' : 'Confirm Meter Link'}
            </button>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
