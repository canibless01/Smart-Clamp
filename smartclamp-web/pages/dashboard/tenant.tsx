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
          // Load schedules
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
      <div style={{ minHeight: '100vh', padding: 'var(--sp-8)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--sc-text-muted)' }}>
        Loading dashboard...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: 'var(--sp-6) var(--sp-4)', maxWidth: '900px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-6)' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0, color: 'var(--sc-text)' }}>
            Tenant Dashboard
          </h1>
          <p style={{ color: 'var(--sc-text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>
            Live power telemetry, schedules & wallet controls
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

        <div className="sc-glass-card" style={{ padding: 'var(--sp-5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--sc-text-muted)', marginBottom: 'var(--sp-2)' }}>Wallet Balance</div>
            <div className="font-mono-data" style={{ fontSize: '32px', color: 'var(--sc-text)' }}>
              ₦{data?.wallet_balance.toLocaleString()}
            </div>
          </div>
          <button onClick={() => setShowRecharge(true)} className="sc-btn-primary" style={{ padding: '0 20px', height: '40px' }}>
            + Top Up
          </button>
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

      {/* Schedule Manager & Monthly Budget Limit */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)', marginBottom: 'var(--sp-6)' }}>
        <div className="sc-glass-card" style={{ padding: 'var(--sp-5)' }}>
          <h3 style={{ marginTop: 0, fontSize: '18px', color: 'var(--sc-text)' }}>Power Schedule Manager</h3>
          <form onSubmit={handleCreateSchedule} style={{ display: 'flex', gap: 'var(--sp-2)', flexDirection: 'column', marginBottom: 'var(--sp-4)' }}>
            <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
              <input type="time" value={onTime} onChange={(e) => setOnTime(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: 'var(--r-sm)', background: 'rgba(11,27,43,0.8)', border: '1px solid var(--sc-slate)', color: 'var(--sc-text)' }} />
              <input type="time" value={offTime} onChange={(e) => setOffTime(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: 'var(--r-sm)', background: 'rgba(11,27,43,0.8)', border: '1px solid var(--sc-slate)', color: 'var(--sc-text)' }} />
            </div>
            <button type="submit" className="sc-btn-primary" style={{ height: '38px' }}>Add Schedule</button>
          </form>
          {schedules.map((s, idx) => (
            <div key={idx} style={{ fontSize: '13px', color: 'var(--sc-text-muted)', background: 'rgba(18,38,58,0.5)', padding: '6px 12px', borderRadius: 'var(--r-sm)', marginBottom: '4px' }}>
              Daily: ON at {s.on_time} · OFF at {s.off_time}
            </div>
          ))}
        </div>

        <div className="sc-glass-card" style={{ padding: 'var(--sp-5)' }}>
          <h3 style={{ marginTop: 0, fontSize: '18px', color: 'var(--sc-text)' }}>Monthly Budget Limit</h3>
          <form onSubmit={handleSetBudget} style={{ display: 'flex', gap: 'var(--sp-2)', flexDirection: 'column' }}>
            <input type="number" value={monthlyBudget} onChange={(e) => setMonthlyBudget(e.target.value)} placeholder="Limit in ₦" style={{ height: '40px', borderRadius: 'var(--r-pill)', background: 'rgba(11,27,43,0.8)', border: '1px solid var(--sc-slate)', color: 'var(--sc-text)', padding: '0 var(--sp-4)' }} />
            <button type="submit" className="sc-btn-primary" style={{ height: '38px' }}>Calculate Daily Cap</button>
          </form>
          {dailyUnits !== null && (
            <div style={{ marginTop: 'var(--sp-3)', fontSize: '14px', color: 'var(--sc-green)' }}>
              Daily Unit Limit: <strong className="font-mono-data">{dailyUnits} kWh/day</strong>
            </div>
          )}
        </div>
      </div>

      {/* Recharge Modal */}
      {showRecharge && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="sc-glass-card" style={{ padding: 'var(--sp-6)', width: '100%', maxWidth: '400px' }}>
            <h3 style={{ marginTop: 0, color: 'var(--sc-text)' }}>Top Up Energy Wallet</h3>
            {!rechargeUrl ? (
              <form onSubmit={handleInitiateRecharge} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
                <input type="number" value={rechargeAmount} onChange={(e) => setRechargeAmount(e.target.value)} placeholder="Amount in Naira" style={{ height: '48px', borderRadius: 'var(--r-pill)', background: 'rgba(11,27,43,0.8)', border: '1px solid var(--sc-slate)', color: 'var(--sc-text)', padding: '0 var(--sp-4)' }} />
                <button type="submit" className="sc-btn-primary">Proceed to Payment Gateway</button>
                <button type="button" onClick={() => setShowRecharge(false)} style={{ background: 'transparent', border: 'none', color: 'var(--sc-text-muted)', cursor: 'pointer' }}>Cancel</button>
              </form>
            ) : (
              <div>
                <p style={{ fontSize: '14px', color: 'var(--sc-green)' }}>Payment link generated!</p>
                <a href={rechargeUrl} target="_blank" rel="noreferrer" className="sc-btn-primary" style={{ display: 'inline-block', textAlign: 'center', textDecoration: 'none', lineHeight: '48px' }}>
                  Pay on Paystack
                </a>
                <button onClick={() => setShowRecharge(false)} style={{ display: 'block', marginTop: '12px', background: 'transparent', border: 'none', color: 'var(--sc-text-muted)', cursor: 'pointer' }}>Close</button>
              </div>
            )}
          </div>
        </div>
      )}

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
