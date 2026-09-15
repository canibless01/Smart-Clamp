import React from 'react';
import Link from 'next/link';

export default function Navbar() {
  return (
    <nav style={{
      padding: 'var(--sp-4) var(--sp-6)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: '1px solid var(--glass-border-neutral)',
      backdropFilter: 'blur(12px)',
      background: 'rgba(11, 27, 43, 0.85)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
        <div style={{ fontSize: '24px', fontWeight: 700, cursor: 'pointer' }}>
          Smart<span style={{ color: 'var(--sc-green)' }}>Clamp</span>
        </div>
      </Link>

      <div style={{ display: 'flex', gap: 'var(--sp-5)', alignItems: 'center', fontSize: '14px', fontWeight: 500 }}>
        <Link href="/how-it-works" style={{ color: 'var(--sc-text-muted)', textDecoration: 'none' }}>How It Works</Link>
        <Link href="/landlords" style={{ color: 'var(--sc-text-muted)', textDecoration: 'none' }}>For Landlords</Link>
        <Link href="/homeowners" style={{ color: 'var(--sc-text-muted)', textDecoration: 'none' }}>For Homeowners</Link>
        <Link href="/smart-meter" style={{ color: 'var(--sc-text-muted)', textDecoration: 'none' }}>Smart Meter</Link>
        <Link href="/pricing" style={{ color: 'var(--sc-text-muted)', textDecoration: 'none' }}>Pricing</Link>
      </div>

      <div style={{ display: 'flex', gap: 'var(--sp-3)', alignItems: 'center' }}>
        <Link href="/#meter-validation" style={{ color: 'var(--sc-green)', textDecoration: 'none', fontSize: '13px', fontWeight: 600, paddingRight: '8px' }}>
          Validate Meter
        </Link>
        <Link href="/login" style={{ textDecoration: 'none' }}>
          <button style={{ background: 'transparent', border: '1px solid var(--sc-slate)', color: 'var(--sc-text)', borderRadius: 'var(--r-pill)', padding: '8px 20px', cursor: 'pointer', fontWeight: 600 }}>
            Log In
          </button>
        </Link>
        <Link href="/signup" style={{ textDecoration: 'none' }}>
          <button className="sc-btn-primary" style={{ height: '40px', padding: '0 20px' }}>
            Sign Up
          </button>
        </Link>
      </div>
    </nav>
  );
}
