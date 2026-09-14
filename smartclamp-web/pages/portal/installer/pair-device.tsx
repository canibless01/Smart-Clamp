import React, { useState } from 'react';
import { fetchWithAuth } from '../../../lib/api';

export default function PairDevicePage() {
  const [role, setRole] = useState('house_full');
  const [hasRelay, setHasRelay] = useState(true);
  const [hasVoltageSensor, setHasVoltageSensor] = useState(true);
  const [roomId, setRoomId] = useState('');
  const [loading, setLoading] = useState(false);
  const [registeredKey, setRegisteredKey] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
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
    <div style={{ minHeight: '100vh', padding: 'var(--sp-6) var(--sp-4)', maxWidth: '520px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '28px', fontWeight 700, color: 'var(--sc-text)', marginBottom: 'var(--sp-6)' }}>
        Installer Portal — Register Device
      </h1>

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
