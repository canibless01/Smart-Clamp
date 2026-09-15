import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function TermsPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--sc-navy)', color: 'var(--sc-text)' }}>
      <Navbar />

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: 'var(--sp-8) var(--sp-4)' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: 'var(--sp-6)' }}>
          Terms & Conditions
        </h1>

        <div className="sc-glass-card" style={{ padding: 'var(--sp-6)', lineHeight: '1.7', fontSize: '14px', color: 'var(--sc-text-muted)' }}>
          <p style={{ marginTop: 0 }}>
            <strong>1. Scope of Service:</strong> SmartClamp provides sub-metering, hardware telemetry verification, and energy monitoring technology. SmartClamp does not generate, resell, or distribute electricity, and does not replace official utility meters.
          </p>
          <p>
            <strong>2. Hardware & Installation:</strong> All physical CT clamp installations must be conducted by qualified personnel adhering to safety protocols. Users agree not to tamper with or bypass device hardware signatures.
          </p>
          <p>
            <strong>3. Step-Up OTP & Commands:</strong> Relay power toggle commands require two-factor step-up confirmation. Users are responsible for safeguarding their OTP credentials.
          </p>
          <p>
            <strong>4. Governing Law:</strong> These terms are governed by the laws of the Federal Republic of Nigeria.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
