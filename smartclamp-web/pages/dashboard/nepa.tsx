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
  }, []);

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
    <div style={{ minHeight: '100vh', padding: 'var(--sp-6) var(--sp-4)', maxWidth: '900px', margin: '0 auto' }}>
      <header style={{ marginBottom: 'var(--sp-6)' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0, color: 'var(--sc-text)' }}>
          DisCo / Utility Staff Portal
        </h1>
        <p style={{ color: 'var(--sc-text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>
          Regional aggregate demand monitoring & grid verification
        </p>
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

      {/* Tamper Flags Drill-Down Table */}
      <div className="sc-glass-card" style={{ padding: 'var(--sp-5)', marginBottom: 'var(--sp-6)' }}>
        <h3 style={{ margin: '0 0 var(--sp-4) 0', fontSize: '18px', color: 'var(--sc-text)' }}>Drift & Tamper Flags</h3>
        {flags.map((f) => (
          <div key={f.alert_id} style={{ padding: 'var(--sp-4)', background: 'rgba(255,107,107,0.1)', border: '1px solid var(--sc-alert)', borderRadius: 'var(--r-sm)', marginBottom: 'var(--sp-2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: 'var(--sc-alert)' }}>
              <span>{f.type} ({f.severity})</span>
              <span>{f.general_area}</span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--sc-text)', marginTop: '4px' }}>
              Identity: {f.customer_name ? f.customer_name : 'Anonymized (No active consent)'}
            </div>
          </div>
        ))}
      </div>

      {/* Send Regional Broadcast Form */}
      <div className="sc-glass-card" style={{ padding: 'var(--sp-5)' }}>
        <h3 style={{ margin: '0 0 var(--sp-2) 0', fontSize: '18px', color: 'var(--sc-text)' }}>Send Regional Outage / Grid Broadcast</h3>
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
