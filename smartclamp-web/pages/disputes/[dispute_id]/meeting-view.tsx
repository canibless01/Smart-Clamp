import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { fetchWithAuth } from '../../../lib/api';

interface UsagePoint {
  timestamp: string;
  power_watts: number;
}

interface BillBreakdownItem {
  tariff_name: string;
  kwh: number;
  rate_per_kwh: number;
  subtotal_naira: number;
}

interface MeetingViewData {
  usage_graph_data: UsagePoint[];
  bill_breakdown: {
    flat_rate: boolean;
    amount_naira: number;
    breakdown: BillBreakdownItem[];
    total_naira: number;
  };
}

export default function MeetingViewPage() {
  const router = useRouter();
  const { dispute_id } = router.query;
  const [data, setData] = useState<MeetingViewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dispute_id) return;

    const loadMeetingView = async () => {
      try {
        const response = await fetchWithAuth(`/api/v1/disputes/${dispute_id}/meeting-view`);
        if (response.ok) {
          setData(await response.json());
        }
      } catch (err) {
        console.error('Failed to load meeting view:', err);
      } finally {
        setLoading(false);
      }
    };
    loadMeetingView();
  }, [dispute_id]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--sc-navy)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--sc-text-muted)' }}>
        Loading Meeting Mode Data...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--sc-navy)', padding: 'var(--sp-6)', boxSizing: 'border-box' }}>
      {/* Explicit Meeting Mode Badge - Full Screen, No Nav Chrome */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-6)', borderBottom: '1px solid var(--sc-slate)', paddingBottom: 'var(--sp-4)' }}>
        <div>
          <span style={{ background: 'var(--sc-warn)', color: 'var(--sc-navy)', fontSize: '12px', fontWeight: 700, padding: '4px 10px', borderRadius: 'var(--r-pill)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Meeting Mode — In-Person Dispute View
          </span>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '8px 0 0 0', color: 'var(--sc-text)' }}>
            Disputed Period Energy Telemetry & Bill Breakdown
          </h1>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--sc-text-muted)' }}>
          Dispute Reference: <strong style={{ color: 'var(--sc-text)' }}>{dispute_id}</strong>
        </div>
      </div>

      {/* Disputed Period Usage Chart Data */}
      <div className="sc-glass-card" style={{ padding: 'var(--sp-5)', marginBottom: 'var(--sp-6)' }}>
        <h2 style={{ marginTop: 0, fontSize: '18px', color: 'var(--sc-green)' }}>
          Usage Telemetry in Disputed Period
        </h2>
        <div style={{ display: 'flex', gap: 'var(--sp-4)', marginTop: 'var(--sp-4)' }}>
          {data?.usage_graph_data.map((pt, i) => (
            <div key={i} style={{ flex: 1, padding: 'var(--sp-3)', background: 'rgba(11,27,43,0.6)', borderRadius: 'var(--r-sm)', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: 'var(--sc-text-muted)' }}>{pt.timestamp}</div>
              <div className="font-mono-data" style={{ fontSize: '24px', color: 'var(--sc-green-bright)', marginTop: '4px' }}>
                {pt.power_watts} W
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Itemized Bill Breakdown */}
      <div className="sc-glass-card" style={{ padding: 'var(--sp-5)' }}>
        <h2 style={{ marginTop: 0, fontSize: '18px', color: 'var(--sc-text)' }}>
          Itemized Tariff & Usage Breakdown
        </h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 'var(--sp-4)' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--sc-slate)', textAlign: 'left', color: 'var(--sc-text-muted)', fontSize: '13px' }}>
              <th style={{ padding: '8px' }}>Tariff Class</th>
              <th style={{ padding: '8px' }}>Energy (kWh)</th>
              <th style={{ padding: '8px' }}>Rate (₦/kWh)</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>Subtotal (₦)</th>
            </tr>
          </thead>
          <tbody>
            {data?.bill_breakdown.breakdown.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid rgba(62,84,104,0.3)', color: 'var(--sc-text)' }}>
                <td style={{ padding: '12px 8px' }}>{item.tariff_name}</td>
                <td className="font-mono-data" style={{ padding: '12px 8px' }}>{item.kwh.toFixed(1)}</td>
                <td className="font-mono-data" style={{ padding: '12px 8px' }}>₦{item.rate_per_kwh.toFixed(2)}</td>
                <td className="font-mono-data" style={{ padding: '12px 8px', textAlign: 'right', color: 'var(--sc-green)' }}>
                  ₦{item.subtotal_naira.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--sp-6)', paddingTop: 'var(--sp-4)', borderTop: '1px solid var(--sc-slate)' }}>
          <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--sc-text)' }}>Total Disputed Statement Amount</span>
          <span className="font-mono-data" style={{ fontSize: '28px', fontWeight: 700, color: 'var(--sc-green-bright)' }}>
            ₦{data?.bill_breakdown.total_naira.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
