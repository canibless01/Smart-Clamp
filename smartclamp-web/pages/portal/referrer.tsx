import React, { useState } from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';

export default function ReferrerPortal() {
  const [copied, setCopied] = useState(false);
  const referralCode = 'REF-PROMO-2026';

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--sc-navy)', color: 'var(--sc-text)' }}>
      <Navbar />

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: 'var(--sp-8) var(--sp-4)' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: 'var(--sp-6)' }}>
          Referrer Partner Portal
        </h1>

        <div className="sc-glass-card" style={{ padding: 'var(--sp-6)', marginBottom: 'var(--sp-6)' }}>
          <h2 style={{ marginTop: 0, fontSize: '20px', color: 'var(--sc-green)' }}>Your Referral Promo Code</h2>
          <div style={{ display: 'flex', gap: 'var(--sp-3)', marginTop: 'var(--sp-3)' }}>
            <input
              type="text"
              readOnly
              value={referralCode}
              style={{ flex: 1, height: '48px', borderRadius: 'var(--r-pill)', background: 'rgba(11,27,43,0.8)', border: '1px solid var(--sc-slate)', color: 'var(--sc-text)', padding: '0 var(--sp-4)', fontFamily: 'monospace', fontSize: '18px', textAlign: 'center' }}
            />
            <button onClick={handleCopyCode} className="sc-btn-primary">
              {copied ? 'Copied!' : 'Copy Code'}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' }}>
          <div className="sc-glass-card" style={{ padding: 'var(--sp-5)' }}>
            <div style={{ fontSize: '13px', color: 'var(--sc-text-muted)' }}>Signups Earned</div>
            <div className="font-mono-data" style={{ fontSize: '32px', color: 'var(--sc-text)', marginTop: '4px' }}>14</div>
          </div>
          <div className="sc-glass-card" style={{ padding: 'var(--sp-5)' }}>
            <div style={{ fontSize: '13px', color: 'var(--sc-text-muted)' }}>Pending Payout</div>
            <div className="font-mono-data" style={{ fontSize: '32px', color: 'var(--sc-green-bright)', marginTop: '4px' }}>₦28,000</div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
