import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--sc-navy)', color: 'var(--sc-text)' }}>
      <Navbar />

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: 'var(--sp-8) var(--sp-4)' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: 'var(--sp-6)' }}>
          Privacy Policy (NDPR Compliant)
        </h1>

        <div className="sc-glass-card" style={{ padding: 'var(--sp-6)', lineHeight: '1.7', fontSize: '14px', color: 'var(--sc-text-muted)' }}>
          <p style={{ marginTop: 0 }}>
            <strong>1. Data Minimization & Protection:</strong> SmartClamp adheres strictly to NDPR (Nigeria Data Protection Regulation) principles. Customer identifiers are anonymized across public tamper logs and DisCo staff views unless explicit consent is granted.
          </p>
          <p>
            <strong>2. Internal Audit Logging:</strong> Internal staff access to customer telemetry or account records automatically generates an immutable entry in our audit log (`audit_log`), recording staff ID, timestamp, and purpose.
          </p>
          <p>
            <strong>3. Utility Control Consent:</strong> Customers maintain full control over utility access. Utility remote control capabilities are opt-in only and can be revoked at any time via the Utility Control Consent settings.
          </p>
          <p>
            <strong>4. Meeting Mode Privacy:</strong> Dispute Center Meeting Mode renders only data-minimized usage graphs and bill breakdown data relevant to the specific dispute to allow safe in-person sharing.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
