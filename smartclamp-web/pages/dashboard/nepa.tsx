import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '../../lib/api';

interface OverviewData {
  transformer_count: number;
  total_consumption_kwh: number;
  active_tamper_flags: number;
}

interface TamperFlag {
  alert_id: string;
  type: string;
  severity: string;
  customer_name?: string | null;
  general_area: string;
}

export default function NepaDashboard() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [flags, setFlags] = useState<TamperFlag[]>([]);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastSent, setBroadcastSent] = useState<string | null>(null);

  // Consent & Command Test States
  const [consentGranted, setConsentGranted] = useState(false);
  const [commandMsg, setCommandMsg] = useState<string | null>(null);

  // Disconnection & Bill Generation
  const [discListCount, setDiscListCount] = useState<number | null>(null);
  const [generatedBillAmount, setGeneratedBillAmount] = useState<number | null>(null);

  useEffect(() => {
    const loadNepaData = async () => {
      try {
        const [ovRes, flagRes] = await Promise.all([
          fetchWithAuth('/api/v1/nepa/community-overview?region=Lagos'),
          fetchWithAuth('/api/v1/nepa/tamper-flags?region=Lagos')
        ]);
        if (ovRes.ok) setOverview(await ovRes.json());
        if (flagRes.ok) setFlags(await flagRes.json());
      } catch (err) {
        console.error('Failed to load NEPA dashboard:', err);
      }
    };
    loadNepaData();
  }, [consentGranted]);

  const handleToggleConsent = async () => {
    try {
      const endpoint = consentGranted ? '/api/v1/consents/utility-control/revoke' : '/api/v1/consents/utility-control';
      const res = await fetchWithAuth(endpoint, { method: 'POST' });
      if (res.ok) {
        setConsentGranted(!consentGranted);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRequestNepaCommand = async () => {
    setCommandMsg(null);
    try {
      const response = await fetchWithAuth('/api/v1/nepa/commands', {
        method: 'POST',
        body: JSON.stringify({ device_id: 'dev-1', command: 'relay_off' })
      });
      const data = await response.json();
      if (response.ok) {
        setCommandMsg('Command pending customer confirmation.');
      } else {
        setCommandMsg(`Blocked: ${data.error} (Customer must grant utility control consent)`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateDisconnectionList = async () => {
    try {
      const res = await fetchWithAuth('/api/v1/nepa/disconnection-lists', {
        method: 'POST',
        body: JSON.stringify({ min_days_overdue: 30, region: 'Lagos' })
      });
      const data = await res.json();
      if (res.ok) {
        setDiscListCount(data.item_count);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateNepaBill = async () => {
    try {
      const res = await fetchWithAuth('/api/v1/nepa/bills', {
        method: 'POST',
        body: JSON.stringify({ device_id: 'dev-1', period_start: '2026-08-01', period_end: '2026-08-31' })
      });
      const data = await res.json();
      if (res.ok) {
        setGeneratedBillAmount(data.amount_naira);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;

    try {
      const response = await fetchWithAuth('/api/v1/nepa/broadcasts', {
        method: 'POST',
        body: JSON.stringify({ message: broadcastMessage.trim(), region: 'Lagos' })
      });
      const data = await response.json();
      if (response.ok) {
        setBroadcastSent(`Broadcast dispatched to ${data.recipient_count} recipients!`);
        setBroadcastMessage('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: 'var(--sp-6) var(--sp-4)', maxWidth: '900px', margin: '0 auto', color: 'var(--sc-text)' }}>
      <header style={{ marginBottom: 'var(--sp-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0 }}>
            DisCo / Utility Staff Portal
          </h1>
          <p style={{ color: 'var(--sc-text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>
            Regional aggregate demand monitoring & grid verification
          </p>
        </div>
        <button onClick={handleToggleConsent} style={{ background: consentGranted ? 'rgba(46, 230, 168, 0.2)' : 'rgba(255, 184, 77, 0.2)', border: `1px solid ${consentGranted ? 'var(--sc-green)' : 'var(--sc-warn)'}`, color: consentGranted ? 'var(--sc-green)' : 'var(--sc-warn)', padding: '8px 16px', borderRadius: 'var(--r-pill)', fontWeight: 600, cursor: 'pointer' }}>
          {consentGranted ? 'Utility Control Consent: GRANTED' : 'Utility Control Consent: REVOKED'}
        </button>
      </header>

      {/* Grid Aggregate Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--sp-4)', marginBottom: 'var(--sp-6)' }}>
        <div className="sc-glass-card" style={{ padding: 'var(--sp-5)' }}>
          <div style={{ fontSize: '13px', color: 'var(--sc-text-muted)', marginBottom: 'var(--sp-2)' }}>Transformers Monitored</div>
          <div className="font-mono-data" style={{ fontSize: '32px', color: 'var(--sc-text)' }}>
            {overview?.transformer_count || 0}
          </div>
        </div>

        <div className="sc-glass-card" style={{ padding: 'var(--sp-5)' }}>
          <div style={{ fontSize: '13px', color: 'var(--sc-text-muted)', marginBottom: 'var(--sp-2)' }}>Regional Consumption</div>
          <div className="font-mono-data" style={{ fontSize: '32px', color: 'var(--sc-green-bright)' }}>
            {overview?.total_consumption_kwh.toLocaleString()} <span style={{ fontSize: '16px', color: 'var(--sc-text-muted)' }}>kWh</span>
          </div>
        </div>

        <div className="sc-glass-card" style={{ padding: 'var(--sp-5)' }}>
          <div style={{ fontSize: '13px', color: 'var(--sc-text-muted)', marginBottom: 'var(--sp-2)' }}>Active Tamper Flags</div>
          <div className="font-mono-data" style={{ fontSize: '32px', color: 'var(--sc-alert)' }}>
            {overview?.active_tamper_flags || 0}
          </div>
        </div>
      </div>

      {/* Consent Gated Relay Command Section */}
      <div className="sc-glass-card" style={{ padding: 'var(--sp-5)', marginBottom: 'var(--sp-6)' }}>
        <h3 style={{ margin: '0 0 var(--sp-2) 0', fontSize: '18px' }}>DisCo Utility Relay Command</h3>
        <p style={{ fontSize: '13px', color: 'var(--sc-text-muted)', marginBottom: 'var(--sp-4)' }}>
          Hard-blocked (403) unless active customer consent exists; always requires customer step-up confirmation.
        </p>
        <button onClick={handleRequestNepaCommand} className="sc-btn-primary">Request Remote Disconnect</button>
        {commandMsg && <div style={{ marginTop: 'var(--sp-3)', fontSize: '14px', fontWeight: 600, color: commandMsg.includes('Blocked') ? 'var(--sc-alert)' : 'var(--sc-green)' }}>{commandMsg}</div>}
      </div>

      {/* Disconnection Candidate List & Bill Generator */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)', marginBottom: 'var(--sp-6)' }}>
        <div className="sc-glass-card" style={{ padding: 'var(--sp-5)' }}>
          <h3 style={{ marginTop: 0, fontSize: '18px' }}>Disconnection Candidate Report</h3>
          <p style={{ fontSize: '12px', color: 'var(--sc-text-muted)' }}>Generates report only — never executes automated disconnect.</p>
          <button onClick={handleGenerateDisconnectionList} className="sc-btn-primary" style={{ height: '40px', fontSize: '14px' }}>Generate Report</button>
          {discListCount !== null && <div style={{ marginTop: 'var(--sp-2)', fontSize: '14px', color: 'var(--sc-green)' }}>Candidates Found: {discListCount}</div>}
        </div>

        <div className="sc-glass-card" style={{ padding: 'var(--sp-5)' }}>
          <h3 style={{ marginTop: 0, fontSize: '18px' }}>SmartClamp Verified Bill Generation</h3>
          <p style={{ fontSize: '12px', color: 'var(--sc-text-muted)' }}>Powers the NEPA-verified badge on customer dashboard.</p>
          <button onClick={handleGenerateNepaBill} className="sc-btn-primary" style={{ height: '40px', fontSize: '14px' }}>Generate Verified Bill</button>
          {generatedBillAmount !== null && <div style={{ marginTop: 'var(--sp-2)', fontSize: '14px', color: 'var(--sc-green)' }}>Verified Bill: ₦{generatedBillAmount.toLocaleString()}</div>}
        </div>
      </div>

      {/* Tamper Flags Drill-Down Table */}
      <div className="sc-glass-card" style={{ padding: 'var(--sp-5)', marginBottom: 'var(--sp-6)' }}>
        <h3 style={{ margin: '0 0 var(--sp-4) 0', fontSize: '18px' }}>Drift & Tamper Flags</h3>
        {flags.map((f) => (
          <div key={f.alert_id} style={{ padding: 'var(--sp-4)', background: 'rgba(255,107,107,0.1)', border: '1px solid var(--sc-alert)', borderRadius: 'var(--r-sm)', marginBottom: 'var(--sp-2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: 'var(--sc-alert)' }}>
              <span>{f.type} ({f.severity})</span>
              <span>{f.general_area}</span>
            </div>
            <div style={{ fontSize: '13px', marginTop: '4px' }}>
              Identity: {f.customer_name ? f.customer_name : 'Anonymized (No active consent)'}
            </div>
          </div>
        ))}
      </div>

      {/* Send Regional Broadcast Form */}
      <div className="sc-glass-card" style={{ padding: 'var(--sp-5)' }}>
        <h3 style={{ margin: '0 0 var(--sp-2) 0', fontSize: '18px' }}>Send Regional Outage / Grid Broadcast</h3>
        <form onSubmit={handleSendBroadcast} style={{ display: 'flex', gap: 'var(--sp-3)', flexDirection: 'column' }}>
          <textarea
            rows={3}
            placeholder="Type advisory or outage broadcast message..."
            value={broadcastMessage}
            onChange={(e) => setBroadcastMessage(e.target.value)}
            style={{ borderRadius: 'var(--r-sm)', background: 'rgba(11,27,43,0.8)', border: '1px solid var(--sc-slate)', color: 'var(--sc-text)', padding: 'var(--sp-3)', resize: 'none' }}
          />
          {broadcastSent && <div style={{ color: 'var(--sc-green)', fontSize: '14px' }}>{broadcastSent}</div>}
          <button type="submit" className="sc-btn-primary" style={{ alignSelf: 'flex-start' }}>Send Broadcast</button>
        </form>
      </div>
    </div>
  );
}
