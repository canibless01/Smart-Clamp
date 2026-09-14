import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '../lib/api';

interface FleetHealth {
  total_devices: number;
  online: number;
  offline: number;
}

export default function InternalOpsCenter() {
  const [fleet, setFleet] = useState<FleetHealth | null>(null);

  useEffect(() => {
    const loadOpsData = async () => {
      try {
        const response = await fetchWithAuth('/api/v1/ops/fleet-health');
        if (response.ok) {
          setFleet(await response.json());
        }
      } catch (err) {
        console.error('Failed to load fleet health:', err);
      }
    };
    loadOpsData();
  }, []);

  return (
    <div style={{ minHeight: '100vh', padding: 'var(--sp-6) var(--sp-4)', maxWidth: '900px', margin: '0 auto' }}>
      <header style={{ marginBottom: 'var(--sp-6)' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0, color: 'var(--sc-text)' }}>
          SmartClamp Internal Operations Center
        </h1>
        <p style={{ color: 'var(--sc-text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>
          Panels A-M Fleet Health, Provenance & Systems Control
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--sp-4)', marginBottom: 'var(--sp-6)' }}>
        <div className="sc-glass-card" style={{ padding: 'var(--sp-5)' }}>
          <div style={{ fontSize: '13px', color: 'var(--sc-text-muted)', marginBottom: 'var(--sp-2)' }}>Total Fleet Size</div>
          <div className="font-mono-data" style={{ fontSize: '32px', color: 'var(--sc-text)' }}>
            {fleet?.total_devices || 0}
          </div>
        </div>

        <div className="sc-glass-card" style={{ padding: 'var(--sp-5)' }}>
          <div style={{ fontSize: '13px', color: 'var(--sc-text-muted)', marginBottom: 'var(--sp-2)' }}>Devices Online</div>
          <div className="font-mono-data" style={{ fontSize: '32px', color: 'var(--sc-green-bright)' }}>
            {fleet?.online || 0}
          </div>
        </div>

        <div className="sc-glass-card" style={{ padding: 'var(--sp-5)' }}>
          <div style={{ fontSize: '13px', color: 'var(--sc-text-muted)', marginBottom: 'var(--sp-2)' }}>Devices Offline</div>
          <div className="font-mono-data" style={{ fontSize: '32px', color: 'var(--sc-alert)' }}>
            {fleet?.offline || 0}
          </div>
        </div>
      </div>
    </div>
  );
}
