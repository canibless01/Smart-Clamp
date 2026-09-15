import React, { useState } from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';

export default function SmartDevicesPage() {
  const [pairedDevices, setPairedDevices] = useState([
    { id: 'tuya-plug-01', name: 'Living Room AC Smart Plug', protocol: 'Tuya', status: 'Connected' }
  ]);
  const [deviceName, setDeviceName] = useState('');

  const handleAddDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceName.trim()) return;
    setPairedDevices([...pairedDevices, { id: `tuya-${Date.now()}`, name: deviceName.trim(), protocol: 'Tuya/Matter', status: 'Connected' }]);
    setDeviceName('');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--sc-navy)', color: 'var(--sc-text)' }}>
      <Navbar />

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: 'var(--sp-8) var(--sp-4)' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: 'var(--sp-6)' }}>
          Linked Smart Devices (Site Map #25b)
        </h1>

        <div className="sc-glass-card" style={{ padding: 'var(--sp-6)', marginBottom: 'var(--sp-6)' }}>
          <h2 style={{ marginTop: 0, fontSize: '20px', color: 'var(--sc-green)' }}>Link New Smart Plug / Bulb</h2>
          <p style={{ color: 'var(--sc-text-muted)', fontSize: '13px' }}>Section 05.8 Path A — Sync Tuya Cloud / Matter smart devices to trigger power cut-offs when budget caps are reached.</p>

          <form onSubmit={handleAddDevice} style={{ display: 'flex', gap: 'var(--sp-3)', marginTop: 'var(--sp-4)' }}>
            <input
              type="text"
              placeholder="Device name (e.g. Master Bedroom AC Plug)"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              style={{ flex: 1, height: '48px', borderRadius: 'var(--r-pill)', background: 'rgba(11,27,43,0.8)', border: '1px solid var(--sc-slate)', color: 'var(--sc-text)', padding: '0 var(--sp-4)' }}
            />
            <button type="submit" className="sc-btn-primary">Link Tuya Device</button>
          </form>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          {pairedDevices.map((d) => (
            <div key={d.id} className="sc-glass-card" style={{ padding: 'var(--sp-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{d.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--sc-text-muted)' }}>Protocol: {d.protocol} · ID: {d.id}</div>
              </div>
              <div style={{ color: 'var(--sc-green)', fontSize: '13px', fontWeight: 600 }}>
                ● {d.status}
              </div>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
