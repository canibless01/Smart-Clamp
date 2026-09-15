import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Link from 'next/link';

export default function HomeownersPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--sc-navy)', color: 'var(--sc-text)' }}>
      <Navbar />

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: 'var(--sp-8) var(--sp-4)' }}>
        <header style={{ textAlign: 'center', marginBottom: 'var(--sp-8)' }}>
          <h1 style={{ fontSize: '42px', fontWeight: 700, margin: '0 0 var(--sp-3) 0' }}>
            SmartClamp for <span style={{ color: 'var(--sc-green)' }}>Single Homeowners</span>
          </h1>
          <p style={{ color: 'var(--sc-text-muted)', fontSize: '18px', maxWidth: '650px', margin: '0 auto' }}>
            Choose between Basic, Basic Pro, or Pro hardware tiers to monitor whole-house energy, solar inverter output, and appliance health.
          </p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--sp-5)', marginBottom: 'var(--sp-8)' }}>
          <div className="sc-glass-card" style={{ padding: 'var(--sp-6)' }}>
            <h2 style={{ marginTop: 0, fontSize: '20px' }}>Single Home Basic</h2>
            <div style={{ fontSize: '13px', color: 'var(--sc-text-muted)', margin: 'var(--sp-2) 0' }}>Pole Device (No Relay)</div>
            <p style={{ fontSize: '14px', color: 'var(--sc-text-muted)', lineHeight: '1.5' }}>
              Read-only power measurement, transformer correlation status ("✅ Verified"), and dispute verification reports.
            </p>
          </div>

          <div className="sc-glass-card" style={{ padding: 'var(--sp-6)', borderColor: 'var(--sc-green)' }}>
            <h2 style={{ marginTop: 0, fontSize: '20px', color: 'var(--sc-green)' }}>Single Home Basic Pro</h2>
            <div style={{ fontSize: '13px', color: 'var(--sc-text-muted)', margin: 'var(--sp-2) 0' }}>Deeper Analytics Layer</div>
            <p style={{ fontSize: '14px', color: 'var(--sc-text-muted)', lineHeight: '1.5' }}>
              Includes appliance load signatures, power factor efficiency, undersupply outage credit calculation, and month-end bill forecasting.
            </p>
          </div>

          <div className="sc-glass-card" style={{ padding: 'var(--sp-6)' }}>
            <h2 style={{ marginTop: 0, fontSize: '20px' }}>Single Home Pro</h2>
            <div style={{ fontSize: '13px', color: 'var(--sc-text-muted)', margin: 'var(--sp-2) 0' }}>Pole Device (With Relay)</div>
            <p style={{ fontSize: '14px', color: 'var(--sc-text-muted)', lineHeight: '1.5' }}>
              Full remote ON/OFF power control, step-up OTP security confirmation, automated daily schedules, and spending budget caps.
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <Link href="/signup" className="sc-btn-primary" style={{ display: 'inline-block', lineHeight: '48px', textDecoration: 'none' }}>
            Setup Homeowner Account
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
