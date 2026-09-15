import React, { useState } from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { fetchWithAuth } from '../../lib/api';

export default function WhiteLabelConsolePage() {
  const [orgName, setOrgName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#2EE6A8');
  const [status, setStatus] = useState<string | null>(null);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim() || !subdomain.trim()) return;

    try {
      const response = await fetchWithAuth('/api/v1/organizations', {
        method: 'POST',
        body: JSON.stringify({ name: orgName.trim(), subdomain: subdomain.trim(), primary_color_hex: primaryColor })
      });
      const data = await response.json();
      if (response.ok) {
        setStatus(`White-label Organization '${orgName}' created! Subdomain: ${subdomain}.smartclamp.ng`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--sc-navy)', color: 'var(--sc-text)' }}>
      <Navbar />

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: 'var(--sp-8) var(--sp-4)' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: 'var(--sp-6)' }}>
          White-Label Admin Console (Site Map #25)
        </h1>

        <div className="sc-glass-card" style={{ padding: 'var(--sp-6)' }}>
          <h2 style={{ marginTop: 0, fontSize: '20px', color: 'var(--sc-green)' }}>Provision B2B / Utility White-Label Portal</h2>

          <form onSubmit={handleCreateOrg} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)', marginTop: 'var(--sp-4)' }}>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--sc-text-muted)', display: 'block', marginBottom: '6px' }}>Organization Name</label>
              <input
                type="text"
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g. Eko Electricity Distribution Co."
                style={{ width: '100%', height: '48px', borderRadius: 'var(--r-pill)', background: 'rgba(11,27,43,0.8)', border: '1px solid var(--sc-slate)', color: 'var(--sc-text)', padding: '0 var(--sp-4)', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '13px', color: 'var(--sc-text-muted)', display: 'block', marginBottom: '6px' }}>Subdomain</label>
              <input
                type="text"
                required
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value)}
                placeholder="e.g. ekedc"
                style={{ width: '100%', height: '48px', borderRadius: 'var(--r-pill)', background: 'rgba(11,27,43,0.8)', border: '1px solid var(--sc-slate)', color: 'var(--sc-text)', padding: '0 var(--sp-4)', boxSizing: 'border-box' }}
              />
            </div>

            {status && (
              <div style={{ color: 'var(--sc-green)', fontWeight: 600, fontSize: '14px' }}>
                {status}
              </div>
            )}

            <button type="submit" className="sc-btn-primary">Create White-Label Organization</button>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
