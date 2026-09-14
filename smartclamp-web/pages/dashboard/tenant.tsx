import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '../../lib/api';
import { useFeatureFlags } from '../../context/FeatureFlagsContext';

interface TenantDashboardData {
  wallet_balance: number;
  live_watts: number;
  relay_state: boolean;
  device_id: string;
  recent_alerts: Array<{ type: string; severity: string; message: string; created_at: string }>;
  nepa_verified: boolean;
}

export default function TenantDashboard() {
  const [data, setData] = useState<TenantDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [stepUpToken, setStepUpToken] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpMessage, setOtpMessage] = useState<string | null>(null);

  const { isFeatureEnabled } = useFeatureFlags();

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await fetchWithAuth('/api/v1/dashboard/tenant');
        const json = await response.json();
        if (response.ok) {
          setData(json);
        }
      } catch (err) {
        console.error('Failed to load tenant dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, []);

  const handleToggleRelay = async () => {
    if (!data?.device_id) return;
    try {
      const response = await fetchWithAuth(`/api/v1/devices/${data.device_id}/relay`, {
        method: 'POST',
        body: JSON.stringify({ state: data.relay_state ? 'off' : 'on' })
      });
      const json = await response.json();
      if (response.ok && json.command_token_id) {
        setStepUpToken(json.command_token_id);
      } else {
        alert(json.error || 'Failed to toggle relay');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stepUpToken) return;

    try {
      const response = await fetchWithAuth(`/api/v1/commands/${stepUpToken}/confirm`, {
        method: 'POST',
        body: JSON.stringify({ otp_code: otpCode })
      });
      const json = await response.json();
      if (response.ok) {
        setOtpMessage('Command confirmed and dispatched!');
        setTimeout(() => {
          setStepUpToken(null);
          setOtpMessage(null);
          setOtpCode('');
        }, 1500);
      } else {
        setOtpMessage(json.error || 'Invalid OTP');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', padding: 'var(--sp-8)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--sc-text-muted)' }}>
        Loading dashboard...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: 'var(--sp-6) var(--sp-4)', maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-6)' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0, color: 'var(--sc-text)' }}>
            Tenant Dashboard
          </h1>
          <p style={{ color: 'var(--sc-text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>
            Live power telemetry & wallet controls
          </p>
        </div>
        {data?.nepa_verified && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(46, 230, 168, 0.1)', border: '1px solid var(--sc-green)', padding: '6px 14px', borderRadius: 'var(--r-pill)' }}>
            <span className="sc-verified-dot" />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--sc-green)' }}>NEPA Verified</span>
          </div>
        )}
      </header>

      {/* Main Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)', marginBottom: 'var(--sp-6)' }}>
        <div className="sc-glass-card" style={{ padding: 'var(--sp-5)' }}>
          <div style={{ fontSize: '13px', color: 'var(--sc-text-muted)', marginBottom: 'var(--sp-2)' }}>Live Demand</div>
          <div className="font-mono-data" style={{ fontSize: '32px', color: 'var(--sc-green-bright)' }}>
            {data?.live_watts.toFixed(1)} <span style={{ fontSize: '18px', color: 'var(--sc-text-muted)' }}>W</span>
          </div>
        </div>

        <div className="sc-glass-card" style={{ padding: 'var(--sp-5)' }}>
          <div style={{ fontSize: '13px', color: 'var(--sc-text-muted)', marginBottom: 'var(--sp-2)' }}>Wallet Balance</div>
          <div className="font-mono-data" style={{ fontSize: '32px', color: 'var(--sc-text)' }}>
            ₦{data?.wallet_balance.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Relay Control Section */}
      <div className="sc-glass-card" style={{ padding: 'var(--sp-5)', marginBottom: 'var(--sp-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 600, color: 'var(--sc-text)' }}>Relay Power Switch</div>
          <div style={{ fontSize: '13px', color: 'var(--sc-text-muted)' }}>
            Current state: {data?.relay_state ? 'ON (Connected)' : 'OFF (Disconnected)'}
          </div>
        </div>
        <button onClick={handleToggleRelay} className="sc-btn-primary">
          {data?.relay_state ? 'Turn Relay Off' : 'Turn Relay On'}
        </button>
      </div>

      {/* Step-Up OTP Modal */}
      {stepUpToken && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="sc-glass-card" style={{ padding: 'var(--sp-6)', width: '100%', maxWidth: '380px', borderColor: 'var(--sc-green)' }}>
            <h3 style={{ marginTop: 0, color: 'var(--sc-text)' }}>Step-Up Security Confirmation</h3>
            <p style={{ fontSize: '13px', color: 'var(--sc-text-muted)' }}>Enter the OTP sent to your registered phone number to confirm relay toggle.</p>
            <form onSubmit={handleConfirmOtp} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
              <input
                type="text"
                placeholder="6-digit OTP (e.g. 123456)"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                style={{ height: '48px', borderRadius: 'var(--r-pill)', background: 'rgba(11,27,43,0.8)', border: '1px solid var(--sc-slate)', color: 'var(--sc-text)', padding: '0 var(--sp-4)', textAlign: 'center', letterSpacing: '4px', fontSize: '18px' }}
              />
              {otpMessage && <div style={{ fontSize: '13px', color: 'var(--sc-green)', fontWeight: 600 }}>{otpMessage}</div>}
              <button type="submit" className="sc-btn-primary">Confirm Command</button>
            </form>
          </div>
        </div>
      )}

      {/* Feature Flag Gated Load Signature Widget */}
      {isFeatureEnabled('basic_pro_load_signature') && (
        <div className="sc-glass-card" style={{ padding: 'var(--sp-5)', marginBottom: 'var(--sp-6)' }}>
          <h3 style={{ marginTop: 0, fontSize: '18px', color: 'var(--sc-green)' }}>Basic Pro — Appliance Load Signatures</h3>
          <p style={{ fontSize: '13px', color: 'var(--sc-text-muted)' }}>Detected active appliances from live current profile:</p>
          <ul style={{ margin: 0, paddingLeft: 'var(--sp-4)', color: 'var(--sc-text)' }}>
            <li>Air Conditioner (92% confidence)</li>
            <li>Refrigerator (98% confidence)</li>
          </ul>
        </div>
      )}
    </div>
  );
}
