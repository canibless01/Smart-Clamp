import React, { useState } from 'react';
import { fetchWithAuth } from '../../../lib/api';

export default function PairDevicePage() {
  const [safetyChecked, setConsentChecked] = useState(false);
  const [role, setRole] = useState('house_full');
  const [hasRelay, setHasRelay] = useState(true);
  const [hasVoltageSensor, setHasVoltageSensor] = useState(true);
  const [roomId, setRoomId] = useState('');
  const [loading, setLoading] = useState(false);
  const [registeredKey, setRegisteredKey] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!safetyChecked) {
      alert('You must confirm the physical installation safety protocol before registering.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetchWithAuth('/api/v1/devices/register', {
        method: 'POST',
        body: JSON.stringify({
          role,
          has_relay: hasRelay,
          has_voltage_sensor: hasVoltageSensor,
          room_id: roomId || null
        })
      });

      const data = await response.json();
      if (response.ok) {
        setDeviceId(data.device_id);
        setRegisteredKey(data.device_hmac_key_raw);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: 'var(--sp-6) var(--sp-4)', maxWidth: '600px', margin: '0 auto', color: 'var(--sc-text)' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: 'var(--sp-6)' }}>
        Installer Portal — Device Registration
      </h1>

      {/* Electrical Safety Protocol Banner */}
      <div className="sc-glass-card" style={{ padding: 'var(--sp-5)', marginBottom: 'var(--sp-6)', borderColor: 'var(--sc-warn)' }}>
        <h3 style={{ marginTop: 0, color: 'var(--sc-warn)', fontSize: '16px' }}>⚡ Physical Installation Safety Protocol</h3>
        <ul style={{ fontSize: '13px', color: 'var(--sc-text-muted)', margin: 'var(--sp-2) 0', paddingLeft: '20px', lineHeight: '1.6' }}>
          <li>Wear rated installer PPE (insulated gloves & protective eyewear).</li>
          <li>Use voltage-rated insulated tools at every step.</li>
          <li><strong>Live Wire CT Clamping:</strong> A qualified electrician must handle clamp closure around live un-energized wires.</li>
        </ul>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: 'var(--sp-3)', fontSize: '13px', fontWeight: 600, color: 'var(--sc-text)' }}>
          <input
            type="checkbox"
            checked={safetyChecked}
            onChange={(e) => setConsentChecked(e.target.checked)}
          />
          I confirm physical safety protocol & electrician presence for live clamp closure.
        </label>
      </div>

      {!registeredKey ? (
        <form onSubmit={handleRegister} className="sc-glass-card" style={{ padding: 'var(--sp-6)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <div>
            <label style={{ fontSize: '13px', color: 'var(--sc-text-muted)', display: 'block', marginBottom: '6px' }}>
              Device Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{ width: '100%', height: '48px', borderRadius: 'var(--r-pill)', background: 'rgba(11,27,43,0.8)', border: '1px solid var(--sc-slate)', color: 'var(--sc-text)', padding: '0 var(--sp-4)' }}
            >
              <option value="house_full">house_full</option>
              <option value="pole_device">pole_device</option>
              <option value="pole_gateway">pole_gateway</option>
              <option value="transformer_monitor">transformer_monitor</option>
              <option value="building_hub">building_hub</option>
              <option value="ir_reader">ir_reader</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '13px', color: 'var(--sc-text-muted)', display: 'block', marginBottom: '6px' }}>
              Room ID (Optional)
            </label>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="UUID"
              style={{ width: '100%', height: '48px', borderRadius: 'var(--r-pill)', background: 'rgba(11,27,43,0.6)', border: '1px solid var(--sc-slate)', color: 'var(--sc-text)', padding: '0 var(--sp-4)', boxSizing: 'border-box' }}
            />
          </div>

          <button type="submit" className="sc-btn-primary" disabled={loading}>
            {loading ? 'Registering...' : 'Register Device'}
          </button>
        </form>
      ) : (
        <div className="sc-glass-card" style={{ padding: 'var(--sp-6)', borderColor: 'var(--sc-green)' }}>
          <h2 style={{ fontSize: '20px', color: 'var(--sc-green)', marginTop: 0 }}>Device Registered Successfully</h2>
          <p style={{ fontSize: '14px', color: 'var(--sc-text-muted)' }}>Device ID: {deviceId}</p>
          <div style={{ background: 'rgba(0,0,0,0.4)', padding: 'var(--sp-4)', borderRadius: 'var(--r-sm)', fontFamily: 'monospace', wordBreak: 'break-all', color: 'var(--sc-green-bright)', margin: 'var(--sp-4) 0' }}>
            {registeredKey}
          </div>
          <p style={{ fontSize: '13px', color: 'var(--sc-alert)', fontWeight: 600 }}>
            ⚠️ Burn this key into device firmware now via BLE tool — it will not be shown again.
          </p>
        </div>
      )}
    </div>
  );
}
