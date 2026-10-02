import React, { useState } from 'react';
import { fetchWithAuth } from '../../lib/api';

export default function HomeownerDashboard() {
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  const handleGenerateReport = async () => {
    setLoadingReport(true);
    try {
      const response = await fetchWithAuth('/api/v1/verification-reports', {
        method: 'POST',
        body: JSON.stringify({ device_id: 'house-full-01' })
      });
      const data = await response.json();
      if (response.ok) {
        setReportUrl(data.microsite_url);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingReport(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: 'var(--sp-6) var(--sp-4)', maxWidth: '900px', margin: '0 auto', color: 'var(--sc-text)' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-6)' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0 }}>
            Homeowner Energy Verification
          </h1>
          <p style={{ color: 'var(--sc-text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>
            Whole-house energy monitoring & Solar/Grid balance
          </p>
        </div>
        <button onClick={handleGenerateReport} className="sc-btn-primary" disabled={loadingReport}>
          {loadingReport ? 'Generating...' : 'Share Verification Report'}
        </button>
      </header>

      {/* Generated Verification Report Url Card */}
      {reportUrl && (
        <div className="sc-glass-card" style={{ padding: 'var(--sp-5)', marginBottom: 'var(--sp-6)', borderColor: 'var(--sc-green)' }}>
          <h3 style={{ marginTop: 0, color: 'var(--sc-green)' }}>Signed Public Verification Link Generated</h3>
          <p style={{ fontSize: '13px', color: 'var(--sc-text-muted)' }}>Share this cryptographically signed report link with any third party:</p>
          <a href={reportUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--sc-green-bright)', wordBreak: 'break-all', fontWeight: 600 }}>
            {reportUrl}
          </a>
        </div>
      )}

      {/* Grid vs Solar Split */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--sp-4)', marginBottom: 'var(--sp-6)' }}>
        <div className="sc-glass-card" style={{ padding: 'var(--sp-5)' }}>
          <div style={{ fontSize: '13px', color: 'var(--sc-text-muted)' }}>Live Total Consumption</div>
          <div className="font-mono-data" style={{ fontSize: '32px', color: 'var(--sc-text)', marginTop: '4px' }}>
            2.4 <span style={{ fontSize: '18px', color: 'var(--sc-text-muted)' }}>kW</span>
          </div>
        </div>

        <div className="sc-glass-card" style={{ padding: 'var(--sp-5)' }}>
          <div style={{ fontSize: '13px', color: 'var(--sc-text-muted)' }}>Grid Power Inflow</div>
          <div className="font-mono-data" style={{ fontSize: '32px', color: 'var(--sc-green-bright)', marginTop: '4px' }}>
            1.8 <span style={{ fontSize: '18px', color: 'var(--sc-text-muted)' }}>kW</span>
          </div>
        </div>

        <div className="sc-glass-card" style={{ padding: 'var(--sp-5)' }}>
          <div style={{ fontSize: '13px', color: 'var(--sc-text-muted)' }}>Solar Inverter Generation</div>
          <div className="font-mono-data" style={{ fontSize: '32px', color: 'var(--sc-warn)', marginTop: '4px' }}>
            0.6 <span style={{ fontSize: '18px', color: 'var(--sc-text-muted)' }}>kW</span>
          </div>
        </div>
      </div>
    </div>
  );
}
