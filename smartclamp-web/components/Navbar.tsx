import React from 'react';
import Link from 'next/link';

export default function Navbar() {
  return (
    <nav style={{
      width: '100%',
      borderBottom: '1px solid var(--glass-border-neutral)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      background: 'rgba(11, 27, 43, 0.90)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* Brand Logo */}
        <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.02em', cursor: 'pointer' }}>
            Smart<span style={{ color: 'var(--sc-green)' }}>Clamp</span>
          </div>
        </Link>

        {/* Center Nav Links */}
        <div style={{
          display: 'flex',
          gap: '24px',
          alignItems: 'center',
          fontSize: '14px',
          fontWeight: 600,
          flexWrap: 'wrap'
        }}>
          <Link href="/how-it-works" style={{ color: 'var(--sc-text-muted)', textDecoration: 'none', transition: 'color 200ms' }}>How It Works</Link>
          <Link href="/landlords" style={{ color: 'var(--sc-text-muted)', textDecoration: 'none', transition: 'color 200ms' }}>For Landlords</Link>
          <Link href="/homeowners" style={{ color: 'var(--sc-text-muted)', textDecoration: 'none', transition: 'color 200ms' }}>For Homeowners</Link>
          <Link href="/smart-meter" style={{ color: 'var(--sc-text-muted)', textDecoration: 'none', transition: 'color 200ms' }}>Smart Meter</Link>
          <Link href="/pricing" style={{ color: 'var(--sc-text-muted)', textDecoration: 'none', transition: 'color 200ms' }}>Pricing</Link>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href="/#meter-validation" style={{ color: 'var(--sc-green)', textDecoration: 'none', fontSize: '13px', fontWeight: 700, paddingRight: '4px' }}>
            Validate Meter
          </Link>
          <Link href="/login" style={{ textDecoration: 'none' }}>
            <button className="sc-btn-secondary" style={{ height: '40px', padding: '0 18px', fontSize: '14px' }}>
              Log In
            </button>
          </Link>
          <Link href="/signup" style={{ textDecoration: 'none' }}>
            <button className="sc-btn-primary" style={{ height: '40px', padding: '0 20px', fontSize: '14px' }}>
              Sign Up
            </button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
