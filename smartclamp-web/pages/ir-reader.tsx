import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { fetchWithAuth } from '../lib/api';

export default function IrReaderPage() {
  const [meterNumber, setMeterNumber] = useState('');
  const [disco, setDisco] = useState('EKEDC');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleOrderAndSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meterNumber.trim()) return;
    setLoading(true);

    try {
      const response = await fetchWithAuth('/api/v1/meters/link', {
        method: 'POST',
        body: JSON.stringify({ meter_number: meterNumber.trim(), disco_name: disco })
      });
      const data = await response.json();
      if (response.ok) {
        setStatus(`IR-Reader paired to meter ${meterNumber}! Shipping dispatch initiated.`);
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
        <header style={{ textAlign: 'center', marginBottom: 'var(--sp-8)' }}>
          <h1 style={{ fontSize: '38px', fontWeight: 700, margin: '0 0 var(--sp-2) 0' }}>
            Optical IR-Reader Order & Setup
          </h1>
          <p style={{ color: 'var(--sc-text-muted)', fontSize: '16px' }}>
            Section 06.1a — Non-invasive magnetic attachment over smart meter IEC 62056 optical port.
          </p>
        </header>

        <form onSubmit={handleOrderAndSetup} className="sc-glass-card" style={{ padding: 'var(--sp-6)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <div>
            <label style={{ fontSize: '13px', color: 'var(--sc-text-muted)', display: 'block', marginBottom: '6px' }}>
              Target Smart Meter Number
            </label>
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
            <label style={{ fontSize: '13px', color: 'var(--sc-text-muted)', display: 'block', marginBottom: '6px' }}>
              Distribution Company (DisCo)
            </label>
            <select
              value={disco}
              onChange={(e) => setDisco(e.target.value)}
              style={{ width: '100%', height: '48px', borderRadius: 'var(--r-pill)', background: 'rgba(11,27,43,0.8)', border: '1px solid var(--sc-slate)', color: 'var(--sc-text)', padding: '0 var(--sp-4)' }}
            >
              <option value="EKEDC">EKEDC (Eko)</option>
              <option value="IKEDC">IKEDC (Ikeja)</option>
              <option value="AEDC">AEDC (Abuja)</option>
              <option value="IBEDC">IBEDC (Ibadan)</option>
              <option value="PHED">PHED (Port Harcourt)</option>
            </select>
          </div>

          {status && (
            <div style={{ color: 'var(--sc-green)', fontWeight: 600, fontSize: '14px' }}>
              {status}
            </div>
          )}

          <button type="submit" className="sc-btn-primary" disabled={loading}>
            {loading ? 'Processing Order...' : 'Confirm Order & Pair Meter'}
          </button>
        </form>
      </main>

      <Footer />
    </div>
  );
}
