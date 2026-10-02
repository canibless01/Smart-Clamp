import React from 'react';
import Navbar from '../../../components/Navbar';
import Footer from '../../../components/Footer';
import Link from 'next/link';

export default function InstallerPortalIndex() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--sc-navy)', color: 'var(--sc-text)' }}>
      <Navbar />

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: 'var(--sp-8) var(--sp-4)' }}>
        <header style={{ marginBottom: 'var(--sp-8)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 700, margin: 0 }}>
              Installer & Field Ops Portal
            </h1>
            <p style={{ color: 'var(--sc-text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>
              Physical CT Clamp mounting, device registration & BLE firmware provisioning
            </p>
          </div>
          <Link href="/portal/installer/pair-device" className="sc-btn-primary" style={{ display: 'inline-block', lineHeight: '48px', textDecoration: 'none' }}>
            + Register New Device
          </Link>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)', marginBottom: 'var(--sp-6)' }}>
          <div className="sc-glass-card" style={{ padding: 'var(--sp-5)' }}>
            <div style={{ fontSize: '13px', color: 'var(--sc-text-muted)' }}>Assigned Installation Jobs</div>
            <div className="font-mono-data" style={{ fontSize: '32px', color: 'var(--sc-text)', marginTop: '4px' }}>3 Jobs Pending</div>
          </div>
          <div className="sc-glass-card" style={{ padding: 'var(--sp-5)' }}>
            <div style={{ fontSize: '13px', color: 'var(--sc-text-muted)' }}>Completed Installs This Month</div>
            <div className="font-mono-data" style={{ fontSize: '32px', color: 'var(--sc-green-bright)', marginTop: '4px' }}>18 Devices</div>
          </div>
        </div>

        <div className="sc-glass-card" style={{ padding: 'var(--sp-6)' }}>
          <h2 style={{ marginTop: 0, fontSize: '20px', color: 'var(--sc-green)' }}>Quick Tools</h2>
          <div style={{ display: 'flex', gap: 'var(--sp-3)', marginTop: 'var(--sp-4)' }}>
            <Link href="/portal/installer/pair-device" className="sc-btn-primary" style={{ display: 'inline-block', lineHeight: '40px', height: '40px', fontSize: '13px', textDecoration: 'none' }}>
              Device Registration & HMAC Tool
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
