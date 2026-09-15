import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--glass-border-neutral)',
      background: 'rgba(7, 18, 29, 0.95)',
      padding: 'var(--sp-8) var(--sp-6) var(--sp-6) var(--sp-6)',
      marginTop: 'var(--sp-10)',
      color: 'var(--sc-text-muted)',
      fontSize: '14px'
    }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 'var(--sp-6)', marginBottom: 'var(--sp-8)' }}>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--sc-text)', marginBottom: 'var(--sp-3)' }}>
              Smart<span style={{ color: 'var(--sc-green)' }}>Clamp</span>
            </div>
            <p style={{ fontSize: '13px', lineHeight: '1.6', maxWidth: '300px' }}>
              Sub-metering, verification, and hardware energy monitoring platform for Nigerian households, landlords, and DisCos.
            </p>
          </div>

          <div>
            <div style={{ fontWeight: 600, color: 'var(--sc-text)', marginBottom: 'var(--sp-3)' }}>Product</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <Link href="/how-it-works" style={{ color: 'inherit', textDecoration: 'none' }}>How It Works</Link>
              <Link href="/smart-meter" style={{ color: 'inherit', textDecoration: 'none' }}>Meter Integration</Link>
              <Link href="/ir-reader" style={{ color: 'inherit', textDecoration: 'none' }}>IR-Reader</Link>
              <Link href="/pricing" style={{ color: 'inherit', textDecoration: 'none' }}>Pricing</Link>
              <Link href="/vending" style={{ color: 'inherit', textDecoration: 'none' }}>Water/Gas Vending</Link>
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 600, color: 'var(--sc-text)', marginBottom: 'var(--sp-3)' }}>Solutions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <Link href="/landlords" style={{ color: 'inherit', textDecoration: 'none' }}>For Landlords</Link>
              <Link href="/homeowners" style={{ color: 'inherit', textDecoration: 'none' }}>For Homeowners</Link>
              <Link href="/disputes" style={{ color: 'inherit', textDecoration: 'none' }}>Dispute Center</Link>
              <Link href="/dashboard/nepa" style={{ color: 'inherit', textDecoration: 'none' }}>DisCo Staff Portal</Link>
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 600, color: 'var(--sc-text)', marginBottom: 'var(--sp-3)' }}>Company & Legal</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <Link href="/about" style={{ color: 'inherit', textDecoration: 'none' }}>About Us</Link>
              <Link href="/contact" style={{ color: 'inherit', textDecoration: 'none' }}>Contact & Support</Link>
              <Link href="/faqs" style={{ color: 'inherit', textDecoration: 'none' }}>FAQs</Link>
              <Link href="/terms" style={{ color: 'inherit', textDecoration: 'none' }}>Terms & Conditions</Link>
              <Link href="/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy Policy</Link>
            </div>
          </div>
        </div>

        {/* Compliance Disclaimer */}
        <div style={{ borderTop: '1px solid rgba(62,84,104,0.3)', paddingTop: 'var(--sp-4)', textAlign: 'center', fontSize: '12px', lineHeight: '1.5' }}>
          SmartClamp provides sub-metering and verification technology. It does not generate, resell, or distribute electricity, and does not replace your utility meter.
          <div style={{ marginTop: '8px', color: 'var(--sc-slate)' }}>© {new Date().getFullYear()} SmartClamp Technologies Ltd. All rights reserved.</div>
        </div>
      </div>
    </footer>
  );
}
