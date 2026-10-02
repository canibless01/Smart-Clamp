import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Link from 'next/link';

export default function HowItWorksPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--sc-navy)', color: 'var(--sc-text)' }}>
      <Navbar />

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: 'var(--sp-8) var(--sp-4)' }}>
        <header style={{ textAlign: 'center', marginBottom: 'var(--sp-8)' }}>
          <h1 style={{ fontSize: '42px', fontWeight: 700, margin: '0 0 var(--sp-3) 0' }}>
            How <span style={{ color: 'var(--sc-green)' }}>SmartClamp</span> Works
          </h1>
          <p style={{ color: 'var(--sc-text-muted)', fontSize: '18px', maxWidth: '600px', margin: '0 auto' }}>
            From non-invasive physical installation to cryptographic HMAC verification and live phone controls.
          </p>
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
          <div className="sc-glass-card" style={{ padding: 'var(--sp-6)' }}>
            <div style={{ display: 'flex', gap: 'var(--sp-5)', alignItems: 'flex-start' }}>
              <div style={{ background: 'var(--sc-green)', color: 'var(--sc-navy)', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '20px', flexShrink: 0 }}>
                1
              </div>
              <div>
                <h2 style={{ margin: '0 0 var(--sp-2) 0', fontSize: '22px' }}>Non-Invasive Hardware Attachment</h2>
                <p style={{ color: 'var(--sc-text-muted)', fontSize: '15px', lineHeight: '1.6' }}>
                  No wire stripping or main line breaking required. A certified electrician snaps our Current Transformer (CT) clamp directly around the live un-energized cable (or attaches our optical IR Reader over an existing smart meter's optical port).
                </p>
              </div>
            </div>
          </div>

          <div className="sc-glass-card" style={{ padding: 'var(--sp-6)' }}>
            <div style={{ display: 'flex', gap: 'var(--sp-5)', alignItems: 'flex-start' }}>
              <div style={{ background: 'var(--sc-green)', color: 'var(--sc-navy)', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '20px', flexShrink: 0 }}>
                2
              </div>
              <div>
                <h2 style={{ margin: '0 0 var(--sp-2) 0', fontSize: '22px' }}>Device Signature & Cloud Ingestion</h2>
                <p style={{ color: 'var(--sc-text-muted)', fontSize: '15px', lineHeight: '1.6' }}>
                  Every voltage and current reading is signed at the hardware layer with a unique HMAC key (`X-Device-Signature`) burn-in key before streaming to the cloud backend.
                </p>
              </div>
            </div>
          </div>

          <div className="sc-glass-card" style={{ padding: 'var(--sp-6)' }}>
            <div style={{ display: 'flex', gap: 'var(--sp-5)', alignItems: 'flex-start' }}>
              <div style={{ background: 'var(--sc-green)', color: 'var(--sc-navy)', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '20px', flexShrink: 0 }}>
                3
              </div>
              <div>
                <h2 style={{ margin: '0 0 var(--sp-2) 0', fontSize: '22px' }}>Rule Engine & Relay Triggering</h2>
                <p style={{ color: 'var(--sc-text-muted)', fontSize: '15px', lineHeight: '1.6' }}>
                  Our automated backend checks telemetry against wallet balance, budget caps, schedules, and upstream transformer correlation. When actions are required, step-up OTP command tokens ensure safety and authorization.
                </p>
              </div>
            </div>
          </div>

          <div className="sc-glass-card" style={{ padding: 'var(--sp-6)' }}>
            <div style={{ display: 'flex', gap: 'var(--sp-5)', alignItems: 'flex-start' }}>
              <div style={{ background: 'var(--sc-green)', color: 'var(--sc-navy)', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '20px', flexShrink: 0 }}>
                4
              </div>
              <div>
                <h2 style={{ margin: '0 0 var(--sp-2) 0', fontSize: '22px' }}>Verified Statements & Fair Billing</h2>
                <p style={{ color: 'var(--sc-text-muted)', fontSize: '15px', lineHeight: '1.6' }}>
                  Share cryptographically signed verification reports with room occupants, landlords, or DisCo representatives to resolve disputes transparently.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 'var(--sp-8)' }}>
          <Link href="/signup" className="sc-btn-primary" style={{ display: 'inline-block', lineHeight: '48px', textDecoration: 'none' }}>
            Get Started Now
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
