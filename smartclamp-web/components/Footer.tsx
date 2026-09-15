import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--glass-border-neutral)',
      background: 'rgba(7, 18, 29, 0.95)',
      padding: '48px 24px 32px 24px',
      marginTop: '80px',
      color: 'var(--sc-text-muted)',
      fontSize: '14px',
      width: '100%'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '32px',
          marginBottom: '48px'
        }}>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--sc-text)', marginBottom: '16px' }}>
              Smart<span style={{ color: 'var(--sc-green)' }}>Clamp</span>
            </div>
            <p style={{ fontSize: '13px', lineHeight: '1.6', maxWidth: '320px', margin: 0 }}>
              Hardware sub-metering, CT clamp telemetry, and optical IR verification platform for Nigerian tenants, landlords, homeowners, and DisCos.
            </p>
          </div>

          <div>
            <div style={{ fontWeight: 700, color: 'var(--sc-text)', marginBottom: '16px' }}>Product & Hardware</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <Link href="/how-it-works" style={{ color: 'inherit', textDecoration: 'none' }}>How It Works</Link>
              <Link href="/smart-meter" style={{ color: 'inherit', textDecoration: 'none' }}>Meter Integration</Link>
              <Link href="/ir-reader" style={{ color: 'inherit', textDecoration: 'none' }}>IR-Reader Setup</Link>
              <Link href="/pricing" style={{ color: 'inherit', textDecoration: 'none' }}>Pricing Tiers</Link>
              <Link href="/vending" style={{ color: 'inherit', textDecoration: 'none' }}>Water/Gas Vending</Link>
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 700, color: 'var(--sc-text)', marginBottom: '16px' }}>Solutions & Portals</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <Link href="/landlords" style={{ color: 'inherit', textDecoration: 'none' }}>For Landlords</Link>
              <Link href="/homeowners" style={{ color: 'inherit', textDecoration: 'none' }}>For Homeowners</Link>
              <Link href="/disputes" style={{ color: 'inherit', textDecoration: 'none' }}>Dispute Center</Link>
              <Link href="/dashboard/nepa" style={{ color: 'inherit', textDecoration: 'none' }}>DisCo Staff Portal</Link>
              <Link href="/ops" style={{ color: 'inherit', textDecoration: 'none' }}>Operations Center</Link>
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 700, color: 'var(--sc-text)', marginBottom: '16px' }}>Company & Legal</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <Link href="/about" style={{ color: 'inherit', textDecoration: 'none' }}>About Us</Link>
              <Link href="/contact" style={{ color: 'inherit', textDecoration: 'none' }}>Contact Support</Link>
              <Link href="/faqs" style={{ color: 'inherit', textDecoration: 'none' }}>FAQs</Link>
              <Link href="/terms" style={{ color: 'inherit', textDecoration: 'none' }}>Terms & Conditions</Link>
              <Link href="/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy Policy (NDPR)</Link>
            </div>
          </div>
        </div>

        {/* Mandatory Compliance Disclaimer */}
        <div style={{
          borderTop: '1px solid rgba(62,84,104,0.35)',
          paddingTop: '24px',
          textAlign: 'center',
          fontSize: '12px',
          lineHeight: '1.6'
        }}>
          SmartClamp provides sub-metering and verification technology. It does not generate, resell, or distribute electricity, and does not replace your utility meter.
          <div style={{ marginTop: '8px', color: 'var(--sc-slate)' }}>© {new Date().getFullYear()} SmartClamp Technologies Ltd. All rights reserved.</div>
        </div>
      </div>
    </footer>
  );
}
