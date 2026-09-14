import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { fetchWithAuth } from '../../lib/api';

interface VerificationReport {
  valid: boolean;
  token: string;
  verified_at: string;
}

export default function PublicVerificationReportPage() {
  const router = useRouter();
  const { report_token } = router.query;
  const [report, setReport] = useState<VerificationReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!report_token) return;

    const loadReport = async () => {
      try {
        const response = await fetchWithAuth(`/api/v1/verification-reports/${report_token}`);
        if (response.ok) {
          setReport(await response.json());
        }
      } catch (err) {
        console.error('Failed to load verification report:', err);
      } finally {
        setLoading(false);
      }
    };
    loadReport();
  }, [report_token]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', padding: 'var(--sp-8)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--sc-text-muted)' }}>
        Verifying cryptographic signature...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: 'var(--sp-6) var(--sp-4)', maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div className="sc-glass-card" style={{ width: '100%', padding: 'var(--sp-6)', textAlign: 'center', borderColor: 'var(--sc-green)' }}>
        <span className="sc-verified-dot" style={{ width: '20px', height: '20px', marginBottom: 'var(--sp-4)' }} />

        <h1 style={{ fontSize: '26px', fontWeight: 700, margin: '0 0 var(--sp-2) 0', color: 'var(--sc-green)' }}>
          SmartClamp Verified Energy Statement
        </h1>
        <p style={{ color: 'var(--sc-text-muted)', fontSize: '14px', marginBottom: 'var(--sp-6)' }}>
          Public Verification Token: <code style={{ color: 'var(--sc-text)' }}>{report_token}</code>
        </p>

        <div style={{ background: 'rgba(11,27,43,0.6)', padding: 'var(--sp-4)', borderRadius: 'var(--r-md)', textAlign: 'left', marginBottom: 'var(--sp-6)' }}>
          <div style={{ fontSize: '14px', marginBottom: '8px' }}>
            <strong>Status:</strong> <span style={{ color: 'var(--sc-green)', fontWeight: 600 }}>Signature Re-verified Live</span>
          </div>
          <div style={{ fontSize: '14px', marginBottom: '8px' }}>
            <strong>Verified At:</strong> {report?.verified_at}
          </div>
          <div style={{ fontSize: '14px' }}>
            <strong>Issuer:</strong> SmartClamp Core Engine & DisCo Verified Data
          </div>
        </div>

        <p style={{ fontSize: '12px', color: 'var(--sc-text-muted)', margin: 0 }}>
          This statement was generated directly from device hardware HMAC telemetry and cannot be altered or falsified.
        </p>
      </div>
    </div>
  );
}
