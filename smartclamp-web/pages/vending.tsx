import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function VendingPage() {
  const [utilityType, setUtilityType] = useState<'water' | 'gas'>('water');
  const [meterNumber, setMeterNumber] = useState('');
  const [amount, setAmount] = useState('2000');
  const [token, setToken] = useState<string | null>(null);

  const handleVendToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!meterNumber.trim()) return;
    setToken(`${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--sc-navy)', color: 'var(--sc-text)' }}>
      <Navbar />

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: 'var(--sp-8) var(--sp-4)' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: 'var(--sp-6)' }}>
          Water & Gas Token Vending (Site Map #26)
        </h1>

        <div className="sc-glass-card" style={{ padding: 'var(--sp-6)' }}>
          <p style={{ color: 'var(--sc-text-muted)', fontSize: '14px', marginBottom: 'var(--sp-6)' }}>
            Section 10.6 Phase 5 — Multi-utility STS token vending for water and gas sub-meters plugged into the unified wallet architecture.
          </p>

          <form onSubmit={handleVendToken} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--sc-text-muted)', display: 'block', marginBottom: '6px' }}>Utility Type</label>
              <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
                <button type="button" onClick={() => setUtilityType('water')} style={{ flex: 1, height: '42px', borderRadius: 'var(--r-pill)', border: `1px solid ${utilityType === 'water' ? 'var(--sc-green)' : 'var(--sc-slate)'}`, background: utilityType === 'water' ? 'rgba(46,230,168,0.15)' : 'transparent', color: 'var(--sc-text)', fontWeight: 600 }}>Water Sub-Meter</button>
                <button type="button" onClick={() => setUtilityType('gas')} style={{ flex: 1, height: '42px', borderRadius: 'var(--r-pill)', border: `1px solid ${utilityType === 'gas' ? 'var(--sc-green)' : 'var(--sc-slate)'}`, background: utilityType === 'gas' ? 'rgba(46,230,168,0.15)' : 'transparent', color: 'var(--sc-text)', fontWeight: 600 }}>Gas Sub-Meter</button>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '13px', color: 'var(--sc-text-muted)', display: 'block', marginBottom: '6px' }}>Meter Number</label>
              <input
                type="text"
                required
                value={meterNumber}
                onChange={(e) => setMeterNumber(e.target.value)}
                placeholder="e.g. WM-90123"
                style={{ width: '100%', height: '48px', borderRadius: 'var(--r-pill)', background: 'rgba(11,27,43,0.8)', border: '1px solid var(--sc-slate)', color: 'var(--sc-text)', padding: '0 var(--sp-4)', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '13px', color: 'var(--sc-text-muted)', display: 'block', marginBottom: '6px' }}>Amount (₦)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{ width: '100%', height: '48px', borderRadius: 'var(--r-pill)', background: 'rgba(11,27,43,0.8)', border: '1px solid var(--sc-slate)', color: 'var(--sc-text)', padding: '0 var(--sp-4)', boxSizing: 'border-box' }}
              />
            </div>

            <button type="submit" className="sc-btn-primary">Generate {utilityType.toUpperCase()} Token</button>
          </form>

          {token && (
            <div style={{ marginTop: 'var(--sp-6)', padding: 'var(--sp-4)', background: 'rgba(46,230,168,0.1)', border: '1px solid var(--sc-green)', borderRadius: 'var(--r-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', color: 'var(--sc-text-muted)' }}>Generated STS Token:</div>
              <div className="font-mono-data" style={{ fontSize: '28px', color: 'var(--sc-green-bright)', letterSpacing: '2px', margin: '8px 0' }}>
                {token}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
