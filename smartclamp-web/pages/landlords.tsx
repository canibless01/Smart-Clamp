import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Link from 'next/link';

export default function LandlordsPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--sc-navy)', color: 'var(--sc-text)' }}>
      <Navbar />

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: 'var(--sp-8) var(--sp-4)' }}>
        <header style={{ textAlign: 'center', marginBottom: 'var(--sp-8)' }}>
          <h1 style={{ fontSize: '42px', fontWeight: 700, margin: '0 0 var(--sp-3) 0' }}>
            SmartClamp for <span style={{ color: 'var(--sc-green)' }}>Landlords & Shared Housing</span>
          </h1>
          <p style={{ color: 'var(--sc-text-muted)', fontSize: '18px', maxWidth: '650px', margin: '0 auto' }}>
            Eliminate tenant electricity squabbles, manage sub-metering, and track multi-property portfolios effortlessly.
          </p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-6)', marginBottom: 'var(--sp-8)' }}>
          <div className="sc-glass-card" style={{ padding: 'var(--sp-6)' }}>
            <h2 style={{ fontSize: '22px', color: 'var(--sc-green)', marginTop: 0 }}>Metered Shared Housing</h2>
            <p style={{ fontSize: '14px', color: 'var(--sc-text-muted)', lineHeight: '1.6' }}>
              Assign individual House Full clamp units to each room. Each tenant maintains their own self-loaded wallet balance. Cross-check whole-building DisCo meter against sum of room wallets to detect loss or bypass.
            </p>
          </div>

          <div className="sc-glass-card" style={{ padding: 'var(--sp-6)' }}>
            <h2 style={{ fontSize: '22px', color: 'var(--sc-green)', marginTop: 0 }}>Unmetered (No-Meter) Housing</h2>
            <p style={{ fontSize: '14px', color: 'var(--sc-text-muted)', lineHeight: '1.6' }}>
              Utilize Pooled Building Wallets routed through the landlord. Track room-by-room proportional usage so tenants pay exactly what they consume towards the collective bill before paying DisCos.
            </p>
          </div>
        </div>

        {/* Transfer Device & Vacate Flow Highlight */}
        <div className="sc-glass-card" style={{ padding: 'var(--sp-6)', marginBottom: 'var(--sp-8)', borderColor: 'var(--sc-green)' }}>
          <h2 style={{ marginTop: 0, fontSize: '24px' }}>Seamless Tenant Onboarding & Offboarding</h2>
          <p style={{ color: 'var(--sc-text-muted)', fontSize: '15px', lineHeight: '1.6' }}>
            When a tenant moves out, trigger our 1-click Transfer Device flow (<code>POST /api/v1/rooms/&#123;room_id&#125;/transfer</code>). The room is vacated, pending wallet balances are cleared or archived, and a fresh invite QR link is generated for the incoming tenant.
          </p>
          <Link href="/dashboard/landlord/buildings/new" className="sc-btn-primary" style={{ display: 'inline-block', lineHeight: '48px', textDecoration: 'none', marginTop: 'var(--sp-4)' }}>
            Add Your First Building
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
