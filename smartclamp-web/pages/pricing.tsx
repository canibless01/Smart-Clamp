import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Link from 'next/link';

export default function PricingPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--sc-navy)', color: 'var(--sc-text)' }}>
      <Navbar />

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: 'var(--sp-8) var(--sp-4)' }}>
        <header style={{ textAlign: 'center', marginBottom: 'var(--sp-8)' }}>
          <h1 style={{ fontSize: '42px', fontWeight: 700, margin: '0 0 var(--sp-3) 0' }}>
            Transparent <span style={{ color: 'var(--sc-green)' }}>Subscription Plans</span>
          </h1>
          <p style={{ color: 'var(--sc-text-muted)', fontSize: '18px', maxWidth: '600px', margin: '0 auto' }}>
            Hardware CT clamp features remain available day one. Software tiers unlock advanced control and analytics.
          </p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 'var(--sp-5)', marginBottom: 'var(--sp-10)' }}>
          {/* Free Tier */}
          <div className="sc-glass-card" style={{ padding: 'var(--sp-6)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ marginTop: 0, fontSize: '22px' }}>Free</h2>
              <div className="font-mono-data" style={{ fontSize: '32px', color: 'var(--sc-green)', margin: 'var(--sp-3) 0' }}>₦0</div>
              <p style={{ fontSize: '13px', color: 'var(--sc-text-muted)', lineHeight: '1.6' }}>
                Public meter validation lookup, basic tenant room invitations, and prepaid wallet setup.
              </p>
            </div>
            <Link href="/signup" className="sc-btn-primary" style={{ display: 'block', textAlign: 'center', lineHeight: '48px', textDecoration: 'none', marginTop: 'var(--sp-6)' }}>
              Start Free
            </Link>
          </div>

          {/* Basic Tier */}
          <div className="sc-glass-card" style={{ padding: 'var(--sp-6)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ marginTop: 0, fontSize: '22px' }}>Basic</h2>
              <div className="font-mono-data" style={{ fontSize: '32px', color: 'var(--sc-green)', margin: 'var(--sp-3) 0' }}>
                ₦1,500 <span style={{ fontSize: '14px', color: 'var(--sc-text-muted)' }}>/mo</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--sc-text-muted)', lineHeight: '1.6' }}>
                Live watts consumption counter, daily/weekly graphs, and grid outage notifications.
              </p>
            </div>
            <Link href="/signup" className="sc-btn-primary" style={{ display: 'block', textAlign: 'center', lineHeight: '48px', textDecoration: 'none', marginTop: 'var(--sp-6)' }}>
              Get Basic
            </Link>
          </div>

          {/* Basic Pro Tier */}
          <div className="sc-glass-card" style={{ padding: 'var(--sp-6)', borderColor: 'var(--sc-green)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ background: 'var(--sc-green)', color: 'var(--sc-navy)', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--r-pill)', display: 'inline-block', marginBottom: '8px' }}>
                RECOMMENDED FOR HOMEOWNERS
              </div>
              <h2 style={{ marginTop: 0, fontSize: '22px', color: 'var(--sc-green-bright)' }}>Basic Pro</h2>
              <div className="font-mono-data" style={{ fontSize: '32px', color: 'var(--sc-green-bright)', margin: 'var(--sp-3) 0' }}>
                ₦3,500 <span style={{ fontSize: '14px', color: 'var(--sc-text-muted)' }}>/mo</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--sc-text-muted)', lineHeight: '1.6' }}>
                Appliance load signature recognition, power factor diagnostics, undersupply credit calculation & bill forecasting.
              </p>
            </div>
            <Link href="/signup" className="sc-btn-primary" style={{ display: 'block', textAlign: 'center', lineHeight: '48px', textDecoration: 'none', marginTop: 'var(--sp-6)' }}>
              Get Basic Pro
            </Link>
          </div>

          {/* Pro Tier */}
          <div className="sc-glass-card" style={{ padding: 'var(--sp-6)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ marginTop: 0, fontSize: '22px' }}>Pro / Landlord</h2>
              <div className="font-mono-data" style={{ fontSize: '32px', color: 'var(--sc-green)', margin: 'var(--sp-3) 0' }}>Custom</div>
              <p style={{ fontSize: '13px', color: 'var(--sc-text-muted)', lineHeight: '1.6' }}>
                Full remote relay power switch, step-up OTP security confirmation, automated daily schedules & spending budget limits.
              </p>
            </div>
            <Link href="/signup" className="sc-btn-primary" style={{ display: 'block', textAlign: 'center', lineHeight: '48px', textDecoration: 'none', marginTop: 'var(--sp-6)' }}>
              Contact Sales
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
