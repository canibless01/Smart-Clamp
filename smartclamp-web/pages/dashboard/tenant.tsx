import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '../../lib/api';
import { useFeatureFlags } from '../../context/FeatureFlagsContext';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';

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

  // Recharge Modal State
  const [showRecharge, setShowRecharge] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('5000');
  const [rechargeUrl, setRechargeUrl] = useState<string | null>(null);

  // Schedule State
  const [onTime, setOnTime] = useState('06:00');
  const [offTime, setOffTime] = useState('22:00');
  const [schedules, setSchedules] = useState<any[]>([]);

  // Budget State
  const [monthlyBudget, setMonthlyBudget] = useState('15000');
  const [dailyUnits, setDailyUnits] = useState<number | null>(null);

  const { isFeatureEnabled } = useFeatureFlags();

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await fetchWithAuth('/api/v1/dashboard/tenant');
        const json = await response.json();
        if (response.ok) {
          setData(json);
          if (json.device_id) {
            const schedRes = await fetchWithAuth(`/api/v1/devices/${json.device_id}/schedules`);
            if (schedRes.ok) {
              const schedJson = await schedRes.json();
              setSchedules(schedJson.schedules || []);
            }
          }
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

  const handleInitiateRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetchWithAuth('/api/v1/wallets/mock-wallet-1/recharge', {
        method: 'POST',
        body: JSON.stringify({ amount_naira: parseFloat(rechargeAmount), payment_method: 'card' })
      });
      const json = await response.json();
      if (response.ok) {
        setRechargeUrl(json.checkout_url);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.device_id) return;
    try {
      const response = await fetchWithAuth(`/api/v1/devices/${data.device_id}/schedules`, {
        method: 'POST',
        body: JSON.stringify({ days_of_week: [0, 1, 2, 3, 4, 5, 6], on_time: onTime, off_time: offTime })
      });
      const json = await response.json();
      if (response.ok) {
        setSchedules([...schedules, { id: json.schedule_id, on_time: onTime, off_time: offTime }]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSetBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.device_id) return;
    try {
      const response = await fetchWithAuth(`/api/v1/devices/${data.device_id}/budget`, {
        method: 'POST',
        body: JSON.stringify({ monthly_limit_naira: parseFloat(monthlyBudget) })
      });
      const json = await response.json();
      if (response.ok) {
        setDailyUnits(json.daily_limit_units);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--sc-navy)', padding: 'var(--sp-8)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--sc-text-muted)' }}>
        Loading dashboard...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--sc-navy)', color: 'var(--sc-text)', width: '100%', overflowX: 'hidden' }}>
      <Navbar />

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px 24px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 800, margin: 0, color: 'var(--sc-text)' }}>
              Tenant Dashboard
            </h1>
            <p style={{ color: 'var(--sc-text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>
              Live power telemetry, schedules & wallet controls
            </p>
          </div>
          {data?.nepa_verified && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(46, 230, 168, 0.12)', border: '1px solid var(--sc-green)', padding: '8px 16px', borderRadius: 'var(--r-pill)' }}>
              <span className="sc-verified-dot" />
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--sc-green)' }}>NEPA Verified</span>
            </div>
          )}
        </header>

        {/* Main Metric Cards */}
        <div className="sc-grid-2" style={{ marginBottom: '32px' }}>
          <div className="sc-glass-card">
            <div style={{ fontSize: '13px', color: 'var(--sc-text-muted)', marginBottom: '8px' }}>Live Demand</div>
            <div className="font-mono-data" style={{ fontSize: '36px', color: 'var(--sc-green-bright)' }}>
              {data?.live_watts.toFixed(1)} <span style={{ fontSize: '18px', color: 'var(--sc-text-muted)' }}>W</span>
            </div>
          </div>

          <div className="sc-glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--sc-text-muted)', marginBottom: '8px' }}>Wallet Balance</div>
              <div className="font-mono-data" style={{ fontSize: '36px', color: 'var(--sc-text)' }}>
                ₦{data?.wallet_balance.toLocaleString()}
              </div>
            </div>
            <button onClick={() => setShowRecharge(true)} className="sc-btn-primary" style={{ height: '40px', padding: '0 20px' }}>
              + Top Up
            </button>
          </div>
        </div>

        {/* Relay Control Section */}
        <div className="sc-glass-card" style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '18px', color: 'var(--sc-text)' }}>Relay Power Switch</div>
            <div style={{ fontSize: '14px', color: 'var(--sc-text-muted)', marginTop: '4px' }}>
              Current state: {data?.relay_state ? 'ON (Connected)' : 'OFF (Disconnected)'}
            </div>
          </div>
          <button onClick={handleToggleRelay} className="sc-btn-primary">
            {data?.relay_state ? 'Turn Relay Off' : 'Turn Relay On'}
          </button>
        </div>

        {/* Schedule Manager & Monthly Budget Limit */}
        <div className="sc-grid-2" style={{ marginBottom: '32px' }}>
          <div className="sc-glass-card">
            <h3 style={{ marginTop: 0, fontSize: '18px', fontWeight: 700, color: 'var(--sc-text)' }}>Power Schedule Manager</h3>
            <form onSubmit={handleCreateSchedule} style={{ display: 'flex', gap: '8px', flexDirection: 'column', marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <input type="time" value={onTime} onChange={(e) => setOnTime(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: 'var(--r-sm)', background: 'rgba(11,27,43,0.8)', border: '1px solid var(--sc-slate)', color: 'var(--sc-text)' }} />
                <input type="time" value={offTime} onChange={(e) => setOffTime(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: 'var(--r-sm)', background: 'rgba(11,27,43,0.8)', border: '1px solid var(--sc-slate)', color: 'var(--sc-text)' }} />
              </div>
              <button type="submit" className="sc-btn-primary" style={{ height: '40px' }}>Add Schedule</button>
            </form>
            {schedules.map((s, idx) => (
              <div key={idx} style={{ fontSize: '13px', color: 'var(--sc-text-muted)', background: 'rgba(11,27,43,0.6)', padding: '8px 12px', borderRadius: 'var(--r-sm)', marginBottom: '6px' }}>
                Daily: ON at {s.on_time} · OFF at {s.off_time}
              </div>
            ))}
          </div>

          <div className="sc-glass-card">
            <h3 style={{ marginTop: 0, fontSize: '18px', fontWeight: 700, color: 'var(--sc-text)' }}>Monthly Budget Limit</h3>
            <form onSubmit={handleSetBudget} style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
              <input type="number" value={monthlyBudget} onChange={(e) => setMonthlyBudget(e.target.value)} placeholder="Limit in ₦" style={{ height: '44px', borderRadius: 'var(--r-pill)', background: 'rgba(11,27,43,0.8)', border: '1px solid var(--sc-slate)', color: 'var(--sc-text)', padding: '0 16px', boxSizing: 'border-box' }} />
              <button type="submit" className="sc-btn-primary" style={{ height: '40px' }}>Calculate Daily Cap</button>
            </form>
            {dailyUnits !== null && (
              <div style={{ marginTop: '16px', fontSize: '14px', color: 'var(--sc-green)' }}>
                Daily Unit Limit: <strong className="font-mono-data">{dailyUnits} kWh/day</strong>
              </div>
            )}
          </div>
        </div>

        {/* Feature Flag Gated Load Signature Widget */}
        {isFeatureEnabled('basic_pro_load_signature') && (
          <div className="sc-glass-card" style={{ marginBottom: '32px' }}>
            <h3 style={{ marginTop: 0, fontSize: '18px', color: 'var(--sc-green)', fontWeight: 700 }}>Basic Pro — Appliance Load Signatures</h3>
            <p style={{ fontSize: '13px', color: 'var(--sc-text-muted)' }}>Detected active appliances from live current profile:</p>
            <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--sc-text)', lineHeight: '1.8' }}>
              <li>Air Conditioner (92% confidence)</li>
              <li>Refrigerator (98% confidence)</li>
            </ul>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
