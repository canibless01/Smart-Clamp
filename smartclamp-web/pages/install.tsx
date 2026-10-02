import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Link from 'next/link';

export default function InstallPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--sc-navy)', color: 'var(--sc-text)' }}>
      <Navbar />

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: 'var(--sp-8) var(--sp-4)' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: 'var(--sp-6)' }}>
          Device Pairing & Installation Flow
        </h1>

        <div className="sc-glass-card" style={{ padding: 'var(--sp-6)', marginBottom: 'var(--sp-6)' }}>
          <h2 style={{ marginTop: 0, fontSize: '20px', color: 'var(--sc-green)' }}>CT Clamp Installation Overview</h2>
          <p style={{ color: 'var(--sc-text-muted)', fontSize: '14px', lineHeight: '1.6' }}>
            SmartClamp devices are designed for rapid 3-minute physical mounting around main power feeds. Installers or self-installers scan the physical device QR code to complete pairing and key provisioning.
          </p>

          <Link href="/portal/installer/pair-device" className="sc-btn-primary" style={{ display: 'inline-block', lineHeight: '48px', textDecoration: 'none', marginTop: 'var(--sp-4)' }}>
            Launch Device Registration Tool
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
