import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Link from 'next/link';

export default function PricingPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--sc-navy)', color: 'var(--sc-text)', width: '100%', overflowX: 'hidden' }}>
      <Navbar />

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 24px' }}>
        <header style={{ textAlign: 'center', marginBottom: '64px' }}>
          <h1 style={{ fontSize: '42px', fontWeight: 800, margin: '0 0 16px 0' }}>
            Transparent <span style={{ color: 'var(--sc-green)' }}>Subscription Plans</span>
          </h1>
          <p style={{ color: 'var(--sc-text-muted)', fontSize: '18px', maxWidth: '640px', margin: '0 auto', lineHeight: '1.5' }}>
            Hardware CT clamp features remain available day one. Software tiers unlock advanced control and analytics.
          </p>
        </header>

        <div className="sc-grid-4" style={{ marginBottom: '80px' }}>
          {/* Free Tier */}
          <div className="sc-glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ marginTop: 0, fontSize: '22px', fontWeight: 700 }}>Free</h2>
              <div className="font-mono-data" style={{ fontSize: '32px', color: 'var(--sc-green)', margin: '12px 0' }}>₦0</div>
              <p style={{ fontSize: '13px', color: 'var(--sc-text-muted)', lineHeight: '1.6' }}>
                Public meter validation lookup, basic tenant room invitations, and prepaid wallet setup.
              </p>
            </div>
            <Link href="/signup" className="sc-btn-primary" style={{ width: '100%', marginTop: '24px' }}>
              Start Free
            </Link>
          </div>

          {/* Basic Tier */}
          <div className="sc-glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ marginTop: 0, fontSize: '22px', fontWeight: 700 }}>Basic</h2>
              <div className="font-mono-data" style={{ fontSize: '32px', color: 'var(--sc-green)', margin: '12px 0' }}>
                ₦1,500 <span style={{ fontSize: '14px', color: 'var(--sc-text-muted)' }}>/mo</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--sc-text-muted)', lineHeight: '1.6' }}>
                Live watts consumption counter, daily/weekly graphs, and grid outage notifications.
              </p>
            </div>
            <Link href="/signup" className="sc-btn-primary" style={{ width: '100%', marginTop: '24px' }}>
              Get Basic
            </Link>
          </div>

          {/* Basic Pro Tier */}
          <div className="sc-glass-card" style={{ borderColor: 'var(--sc-green)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ background: 'var(--sc-green)', color: 'var(--sc-navy)', fontSize: '11px', fontWeight: 800, padding: '3px 10px', borderRadius: 'var(--r-pill)', display: 'inline-block', marginBottom: '8px' }}>
                RECOMMENDED FOR HOMEOWNERS
              </div>
              <h2 style={{ marginTop: 0, fontSize: '22px', fontWeight: 700, color: 'var(--sc-green-bright)' }}>Basic Pro</h2>
              <div className="font-mono-data" style={{ fontSize: '32px', color: 'var(--sc-green-bright)', margin: '12px 0' }}>
                ₦3,500 <span style={{ fontSize: '14px', color: 'var(--sc-text-muted)' }}>/mo</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--sc-text-muted)', lineHeight: '1.6' }}>
                Appliance load signature recognition, power factor diagnostics, undersupply credit calculation & bill forecasting.
              </p>
            </div>
            <Link href="/signup" className="sc-btn-primary" style={{ width: '100%', marginTop: '24px' }}>
              Get Basic Pro
            </Link>
          </div>

          {/* Pro Tier */}
          <div className="sc-glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ marginTop: 0, fontSize: '22px', fontWeight: 700 }}>Pro / Landlord</h2>
              <div className="font-mono-data" style={{ fontSize: '32px', color: 'var(--sc-green)', margin: '12px 0' }}>Custom</div>
              <p style={{ fontSize: '13px', color: 'var(--sc-text-muted)', lineHeight: '1.6' }}>
                Full remote relay power switch, step-up OTP security confirmation, automated daily schedules & spending budget limits.
              </p>
            </div>
            <Link href="/signup" className="sc-btn-primary" style={{ width: '100%', marginTop: '24px' }}>
              Contact Sales
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
