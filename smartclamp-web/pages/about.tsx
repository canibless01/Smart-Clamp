import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function AboutPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--sc-navy)', color: 'var(--sc-text)' }}>
      <Navbar />

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: 'var(--sp-8) var(--sp-4)' }}>
        <header style={{ marginBottom: 'var(--sp-8)', textAlign: 'center' }}>
          <h1 style={{ fontSize: '42px', fontWeight: 700, margin: '0 0 var(--sp-3) 0' }}>
            About <span style={{ color: 'var(--sc-green)' }}>SmartClamp</span>
          </h1>
          <p style={{ color: 'var(--sc-text-muted)', fontSize: '18px', maxWidth: '600px', margin: '0 auto' }}>
            Bringing trust, transparency, and hardware accuracy to Nigerian electricity sub-metering.
          </p>
        </header>

        <div className="sc-glass-card" style={{ padding: 'var(--sp-6)', marginBottom: 'var(--sp-6)' }}>
          <h2 style={{ marginTop: 0, fontSize: '24px', color: 'var(--sc-green)' }}>Our Mission</h2>
          <p style={{ fontSize: '15px', lineHeight: '1.7', color: 'var(--sc-text-muted)' }}>
            SmartClamp was created to solve the fundamental lack of trust in shared housing energy billing across Nigeria. By combining non-invasive CT clamp hardware, optical IR smart meter readers, and cryptographic signature verification, we ensure that no tenant pays for someone else's air conditioner, and no landlord is left holding unpaid DisCo bills.
          </p>
        </div>

        <div className="sc-glass-card" style={{ padding: 'var(--sp-6)' }}>
          <h2 style={{ marginTop: 0, fontSize: '24px', color: 'var(--sc-green)' }}>Ecosystem Architecture</h2>
          <p style={{ fontSize: '15px', lineHeight: '1.7', color: 'var(--sc-text-muted)' }}>
            We build for every actor in the ecosystem: tenants managing prepaid room wallets, landlords monitoring multi-property portfolios, homeowners tracking solar/grid splits, installers registering physical devices, and DisCo staff monitoring regional transformer health.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
