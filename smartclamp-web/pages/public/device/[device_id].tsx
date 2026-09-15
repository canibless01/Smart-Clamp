import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { fetchWithAuth } from '../../../lib/api';

interface PublicDeviceData {
  device_id: string;
  current_watts: number;
  current_bill_naira: number;
  status: 'ON' | 'OFF';
}

export default function PublicDeviceViewPage() {
  const router = useRouter();
  const { device_id } = router.query;
  const [data, setData] = useState<PublicDeviceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!device_id) return;

    // Simulate or fetch public device data
    const loadData = async () => {
      try {
        const response = await fetchWithAuth('/api/v1/dashboard/tenant');
        if (response.ok) {
          const json = await response.json();
          setData({
            device_id: device_id as string,
            current_watts: json.live_watts || 450,
            current_bill_naira: 4500,
            status: json.relay_state ? 'ON' : 'OFF'
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [device_id]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--sc-navy)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--sc-text-muted)' }}>
        Loading public device status...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--sc-navy)', padding: 'var(--sp-6) var(--sp-4)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div className="sc-glass-card" style={{ width: '100%', maxWidth: '420px', padding: 'var(--sp-6)', textAlign: 'center' }}>
        <div style={{ fontSize: '13px', color: 'var(--sc-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 'var(--sp-2)' }}>
          Public Device Status View
        </div>
        <div style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--sc-green)', marginBottom: 'var(--sp-6)' }}>
          ID: {device_id}
        </div>

        {/* Live Demand */}
        <div style={{ background: 'rgba(11,27,43,0.6)', padding: 'var(--sp-4)', borderRadius: 'var(--r-md)', marginBottom: 'var(--sp-4)' }}>
          <div style={{ fontSize: '13px', color: 'var(--sc-text-muted)' }}>Current Usage</div>
          <div className="font-mono-data" style={{ fontSize: '36px', color: 'var(--sc-green-bright)', marginTop: '4px' }}>
            {data?.current_watts} <span style={{ fontSize: '18px', color: 'var(--sc-text-muted)' }}>W</span>
          </div>
        </div>

        {/* Current Bill */}
        <div style={{ background: 'rgba(11,27,43,0.6)', padding: 'var(--sp-4)', borderRadius: 'var(--r-md)', marginBottom: 'var(--sp-4)' }}>
          <div style={{ fontSize: '13px', color: 'var(--sc-text-muted)' }}>Current Bill</div>
          <div className="font-mono-data" style={{ fontSize: '32px', color: 'var(--sc-text)', marginTop: '4px' }}>
            ₦{data?.current_bill_naira.toLocaleString()}
          </div>
        </div>

        {/* Status indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: 'var(--sp-6)' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: data?.status === 'ON' ? 'var(--sc-green)' : 'var(--sc-alert)' }} />
          <span style={{ fontWeight: 600, fontSize: '15px' }}>Device Status: {data?.status}</span>
        </div>

        {/* Pay Button */}
        <button
          onClick={() => { alert('Redirecting to instant checkout gateway...'); }}
          className="sc-btn-primary"
          style={{ width: '100%', height: '48px', fontSize: '16px' }}
        >
          Pay Bill / Recharge
        </button>
      </div>
    </div>
  );
}
