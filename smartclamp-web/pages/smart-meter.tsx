import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Link from 'next/link';
import { fetchWithAuth } from '../lib/api';

export default function SmartMeterPage() {
  const [meterNumber, setMeterNumber] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meterNumber.trim()) return;
    setLoading(true);

    try {
      const res = await fetchWithAuth('/api/v1/meters/validate', {
        method: 'POST',
        body: JSON.stringify({ meter_number: meterNumber.trim(), utility_type: 'electricity' })
      });
      setResult(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--sc-navy)', color: 'var(--sc-text)' }}>
      <Navbar />

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: 'var(--sp-8) var(--sp-4)' }}>
        <header style={{ textAlign: 'center', marginBottom: 'var(--sp-8)' }}>
          <h1 style={{ fontSize: '42px', fontWeight: 700, margin: '0 0 var(--sp-3) 0' }}>
            Already Have a Smart Meter?
          </h1>
          <p style={{ color: 'var(--sc-text-muted)', fontSize: '18px', maxWidth: '600px', margin: '0 auto' }}>
            Test your meter number for free or attach our optical IR Reader for real-time telemetry — no physical clamp required.
          </p>
        </header>

        {/* Free Meter Validation Widget */}
        <div className="sc-glass-card" style={{ padding: 'var(--sp-6)', marginBottom: 'var(--sp-8)' }}>
          <h2 style={{ marginTop: 0, fontSize: '22px' }}>Free Meter Lookup</h2>
          <form onSubmit={handleValidate} style={{ display: 'flex', gap: 'var(--sp-3)', marginTop: 'var(--sp-4)' }}>
            <input
              type="text"
              placeholder="Enter DisCo Meter Number"
              value={meterNumber}
              onChange={(e) => setMeterNumber(e.target.value)}
              style={{ flex: 1, height: '48px', borderRadius: 'var(--r-pill)', background: 'rgba(11,27,43,0.8)', border: '1px solid var(--sc-slate)', color: 'var(--sc-text)', padding: '0 var(--sp-4)' }}
            />
            <button type="submit" className="sc-btn-primary" disabled={loading}>
              {loading ? 'Checking...' : 'Check Meter'}
            </button>
          </form>

          {result && (
            <div style={{ marginTop: 'var(--sp-4)', padding: 'var(--sp-4)', background: 'rgba(11,27,43,0.6)', borderRadius: 'var(--r-sm)' }}>
              {result.valid ? (
                <div>
                  <div style={{ color: 'var(--sc-green)', fontWeight: 600 }}>Active DisCo Record Found</div>
                  <div style={{ fontSize: '14px', marginTop: '4px' }}>Customer: {result.customer_name} · Address: {result.address}</div>
                  <Link href="/ir-reader" className="sc-btn-primary" style={{ display: 'inline-block', lineHeight: '40px', height: '40px', fontSize: '13px', textDecoration: 'none', marginTop: 'var(--sp-3)' }}>
                    Order Optical IR-Reader
                  </Link>
                </div>
              ) : (
                <div style={{ color: 'var(--sc-alert)' }}>Meter number invalid or not found.</div>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
