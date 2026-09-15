import React, { useState } from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { fetchWithAuth } from '../../lib/api';

export default function UtilityControlConsentPage() {
  const [granted, setGranted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleToggleConsent = async () => {
    setLoading(true);
    try {
      const endpoint = granted ? '/api/v1/consents/utility-control/revoke' : '/api/v1/consents/utility-control';
      const response = await fetchWithAuth(endpoint, { method: 'POST' });
      if (response.ok) {
        setGranted(!granted);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--sc-navy)', color: 'var(--sc-text)' }}>
      <Navbar />

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: 'var(--sp-8) var(--sp-4)' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: 'var(--sp-6)' }}>
          Utility Control Consent (Section 06.4 Disclosure)
        </h1>

        <div className="sc-glass-card" style={{ padding: 'var(--sp-6)', borderColor: granted ? 'var(--sc-green)' : 'var(--sc-warn)' }}>
          <h2 style={{ marginTop: 0, fontSize: '20px', color: granted ? 'var(--sc-green)' : 'var(--sc-warn)' }}>
            {granted ? 'Status: Utility Control Consent GRANTED' : 'Status: Utility Control Consent REVOKED'}
          </h2>

          <div style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--sc-text-muted)', margin: 'var(--sp-4) 0' }}>
            <p><strong>Mandatory Legal Disclosure:</strong></p>
            <p>
              By granting Utility Control Consent, you authorize verified staff from your Distribution Company (DisCo) to request remote relay power control commands for grid balancing or safety cut-offs.
            </p>
            <p>
              <strong>Safety Guarantees:</strong>
            </p>
            <ul>
              <li>DisCo remote commands are hard-blocked at backend level unless this consent is active.</li>
              <li>Every command requires step-up OTP security confirmation on your mobile phone before physical execution.</li>
              <li>You may revoke this consent at any time with immediate effect.</li>
            </ul>
          </div>

          <button
            onClick={handleToggleConsent}
            className="sc-btn-primary"
            disabled={loading}
            style={{
              background: granted ? 'var(--sc-alert)' : 'var(--sc-green)',
              color: 'var(--sc-navy)'
            }}
          >
            {loading ? 'Updating...' : granted ? 'Revoke Utility Control Consent' : 'Grant Utility Control Consent'}
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
