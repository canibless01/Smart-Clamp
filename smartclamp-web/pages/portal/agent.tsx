import React, { useState } from 'react';

export default function AgentPortal() {
  const [copied, setCopied] = useState(false);
  const referralLink = 'https://app.smartclamp.ng/signup?ref=AGENT-LAGOS-101';

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ minHeight: '100vh', padding: 'var(--sp-6) var(--sp-4)', maxWidth: '800px', margin: '0 auto', color: 'var(--sc-text)' }}>
      <header style={{ marginBottom: 'var(--sp-6)' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0 }}>
          Agent & Referrer Partner Portal
        </h1>
        <p style={{ color: 'var(--sc-text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>
          Track customer onboarding referrals & commission payouts
        </p>
      </header>

      {/* Referral Link Generator */}
      <div className="sc-glass-card" style={{ padding: 'var(--sp-5)', marginBottom: 'var(--sp-6)' }}>
        <h3 style={{ marginTop: 0, color: 'var(--sc-green)' }}>Your Unique Partner Referral Link</h3>
        <div style={{ display: 'flex', gap: 'var(--sp-3)', marginTop: 'var(--sp-3)' }}>
          <input
            type="text"
            readOnly
            value={referralLink}
            style={{ flex: 1, height: '48px', borderRadius: 'var(--r-pill)', background: 'rgba(11,27,43,0.8)', border: '1px solid var(--sc-slate)', color: 'var(--sc-text)', padding: '0 var(--sp-4)', fontFamily: 'monospace' }}
          />
          <button onClick={handleCopyLink} className="sc-btn-primary">
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
      </div>

      {/* Commission & Acquisition Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--sp-4)', marginBottom: 'var(--sp-6)' }}>
        <div className="sc-glass-card" style={{ padding: 'var(--sp-5)' }}>
          <div style={{ fontSize: '13px', color: 'var(--sc-text-muted)' }}>Total Referrals</div>
          <div className="font-mono-data" style={{ fontSize: '32px', color: 'var(--sc-text)', marginTop: '4px' }}>
            28
          </div>
        </div>

        <div className="sc-glass-card" style={{ padding: 'var(--sp-5)' }}>
          <div style={{ fontSize: '13px', color: 'var(--sc-text-muted)' }}>Successful Installs</div>
          <div className="font-mono-data" style={{ fontSize: '32px', color: 'var(--sc-green-bright)', marginTop: '4px' }}>
            21
          </div>
        </div>

        <div className="sc-glass-card" style={{ padding: 'var(--sp-5)' }}>
          <div style={{ fontSize: '13px', color: 'var(--sc-text-muted)' }}>Pending Commission</div>
          <div className="font-mono-data" style={{ fontSize: '32px', color: 'var(--sc-warn)', marginTop: '4px' }}>
            ₦42,000
          </div>
        </div>
      </div>
    </div>
  );
}
