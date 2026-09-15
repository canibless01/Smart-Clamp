import React from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import Link from 'next/link';

export default function SettingsIndex() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--sc-navy)', color: 'var(--sc-text)' }}>
      <Navbar />

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: 'var(--sp-8) var(--sp-4)' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: 'var(--sp-6)' }}>
          Settings & Account Management
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <div className="sc-glass-card" style={{ padding: 'var(--sp-5)' }}>
            <h3 style={{ marginTop: 0, fontSize: '18px', color: 'var(--sc-green)' }}>Profile & Notifications</h3>
            <p style={{ fontSize: '13px', color: 'var(--sc-text-muted)' }}>Manage your phone number, notification preferences, and password.</p>
          </div>

          <div className="sc-glass-card" style={{ padding: 'var(--sp-5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ marginTop: 0, fontSize: '18px', color: 'var(--sc-green)' }}>Linked Smart Devices (Tuya / Matter)</h3>
              <p style={{ fontSize: '13px', color: 'var(--sc-text-muted)', margin: 0 }}>Section 05.8 — Pair third-party smart plugs and bulbs to SmartClamp rule engine.</p>
            </div>
            <Link href="/settings/smart-devices" className="sc-btn-primary" style={{ display: 'inline-block', lineHeight: '40px', height: '40px', fontSize: '13px', textDecoration: 'none' }}>
              Manage Devices
            </Link>
          </div>

          <div className="sc-glass-card" style={{ padding: 'var(--sp-5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ marginTop: 0, fontSize: '18px', color: 'var(--sc-warn)' }}>Utility Control Consent</h3>
              <p style={{ fontSize: '13px', color: 'var(--sc-text-muted)', margin: 0 }}>Section 06.4 — Control DisCo remote utility command access.</p>
            </div>
            <Link href="/consent/utility-control" className="sc-btn-primary" style={{ display: 'inline-block', lineHeight: '40px', height: '40px', fontSize: '13px', textDecoration: 'none', background: 'transparent', border: '1px solid var(--sc-warn)', color: 'var(--sc-warn)' }}>
              Consent Settings
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
