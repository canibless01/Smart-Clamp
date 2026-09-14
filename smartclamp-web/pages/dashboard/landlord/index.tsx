import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '../../../lib/api';

interface BuildingSummary {
  building_id: string;
  name: string;
  occupied: number;
  total_rooms: number;
  revenue_naira: number;
  active_flags: number;
}

interface PortfolioData {
  buildings: BuildingSummary[];
  portfolio_total_revenue_naira: number;
}

export default function LandlordPortfolio() {
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPortfolio = async () => {
      try {
        const response = await fetchWithAuth('/api/v1/dashboard/landlord/portfolio');
        const json = await response.json();
        if (response.ok) {
          setPortfolio(json);
        }
      } catch (err) {
        console.error('Failed to load portfolio:', err);
      } finally {
        setLoading(false);
      }
    };
    loadPortfolio();
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', padding: 'var(--sp-8)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--sc-text-muted)' }}>
        Loading portfolio...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: 'var(--sp-6) var(--sp-4)', maxWidth: '900px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-6)' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0, color: 'var(--sc-text)' }}>
            Landlord Portfolio Overview
          </h1>
          <p style={{ color: 'var(--sc-text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>
            Multi-property occupancy & revenue tracking
          </p>
        </div>
        <button
          onClick={() => { window.location.href = '/dashboard/landlord/buildings/new'; }}
          className="sc-btn-primary"
        >
          + Add Building
        </button>
      </header>

      {/* Portfolio Total Revenue */}
      <div className="sc-glass-card" style={{ padding: 'var(--sp-5)', marginBottom: 'var(--sp-6)' }}>
        <div style={{ fontSize: '13px', color: 'var(--sc-text-muted)', marginBottom: 'var(--sp-2)' }}>Portfolio Total Monthly Revenue</div>
        <div className="font-mono-data" style={{ fontSize: '36px', color: 'var(--sc-green-bright)' }}>
          ₦{portfolio?.portfolio_total_revenue_naira.toLocaleString()}
        </div>
      </div>

      {/* Buildings List Table / Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
        {portfolio?.buildings.map((b) => (
          <div key={b.building_id} className="sc-glass-card" style={{ padding: 'var(--sp-5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: '0 0 var(--sp-2) 0', fontSize: '18px', color: 'var(--sc-text)' }}>{b.name}</h3>
              <div style={{ fontSize: '14px', color: 'var(--sc-text-muted)' }}>
                Occupancy: <strong style={{ color: 'var(--sc-text)' }}>{b.occupied} / {b.total_rooms} rooms</strong>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="font-mono-data" style={{ fontSize: '20px', color: 'var(--sc-green)', fontWeight: 600 }}>
                ₦{b.revenue_naira.toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--sc-text-muted)', marginTop: '4px' }}>
                Active tamper flags: {b.active_flags}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
