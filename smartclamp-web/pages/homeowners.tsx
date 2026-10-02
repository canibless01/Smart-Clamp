import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Link from 'next/link';

export default function HomeownersPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--sc-navy)', color: 'var(--sc-text)', width: '100%', overflowX: 'hidden' }}>
      <Navbar />

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px 24px' }}>
        <header style={{ textAlign: 'center', marginBottom: '64px' }}>
          <h1 style={{ fontSize: '42px', fontWeight: 800, margin: '0 0 16px 0' }}>
            SmartClamp for <span style={{ color: 'var(--sc-green)' }}>Single Homeowners</span>
          </h1>
          <p style={{ color: 'var(--sc-text-muted)', fontSize: '18px', maxWidth: '680px', margin: '0 auto', lineHeight: '1.5' }}>
            Choose between Basic, Basic Pro, or Pro hardware tiers to monitor whole-house energy, solar inverter output, and appliance health.
          </p>
        </header>

        <div className="sc-grid-3" style={{ marginBottom: '64px' }}>
          <div className="sc-glass-card">
            <h2 style={{ marginTop: 0, fontSize: '20px', fontWeight: 700 }}>Single Home Basic</h2>
            <div style={{ fontSize: '13px', color: 'var(--sc-text-muted)', margin: '8px 0 16px 0' }}>Pole Device (No Relay)</div>
            <p style={{ fontSize: '14px', color: 'var(--sc-text-muted)', lineHeight: '1.6', margin: 0 }}>
              Read-only power measurement, transformer correlation status ("✅ Verified"), and dispute verification reports.
            </p>
          </div>

          <div className="sc-glass-card" style={{ borderColor: 'var(--sc-green)' }}>
            <h2 style={{ marginTop: 0, fontSize: '20px', color: 'var(--sc-green)', fontWeight: 700 }}>Single Home Basic Pro</h2>
            <div style={{ fontSize: '13px', color: 'var(--sc-text-muted)', margin: '8px 0 16px 0' }}>Deeper Analytics Layer</div>
            <p style={{ fontSize: '14px', color: 'var(--sc-text-muted)', lineHeight: '1.6', margin: 0 }}>
              Includes appliance load signatures, power factor efficiency, undersupply outage credit calculation, and month-end bill forecasting.
            </p>
          </div>

          <div className="sc-glass-card">
            <h2 style={{ marginTop: 0, fontSize: '20px', fontWeight: 700 }}>Single Home Pro</h2>
            <div style={{ fontSize: '13px', color: 'var(--sc-text-muted)', margin: '8px 0 16px 0' }}>Pole Device (With Relay)</div>
            <p style={{ fontSize: '14px', color: 'var(--sc-text-muted)', lineHeight: '1.6', margin: 0 }}>
              Full remote ON/OFF power control, step-up OTP security confirmation, automated daily schedules, and spending budget caps.
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <Link href="/signup" className="sc-btn-primary" style={{ minWidth: '220px' }}>
            Setup Homeowner Account
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
