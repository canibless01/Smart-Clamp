import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../../../../components/Navbar';
import Footer from '../../../../components/Footer';
import Link from 'next/link';

export default function BuildingDetailPage() {
  const router = useRouter();
  const { building_id } = router.query;
  const [rooms] = useState([
    { id: 'room-1', label: 'Room 1 (Master)', status: 'occupied', tenant: 'Adebayo Ogunlesi', balance: 4500 },
    { id: 'room-2', label: 'Room 2 (Guest)', status: 'occupied', tenant: 'Fatima Musa', balance: 1200 },
    { id: 'room-3', label: 'Room 3 (Back)', status: 'vacant', tenant: null, balance: 0 }
  ]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--sc-navy)', color: 'var(--sc-text)' }}>
      <Navbar />

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: 'var(--sp-8) var(--sp-4)' }}>
        <header style={{ marginBottom: 'var(--sp-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0 }}>
              Building Detail View
            </h1>
            <p style={{ color: 'var(--sc-text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>
              Building ID: <code style={{ color: 'var(--sc-text)' }}>{building_id}</code>
            </p>
          </div>
          <Link href="/dashboard/landlord" className="sc-btn-primary" style={{ display: 'inline-block', lineHeight: '40px', height: '40px', fontSize: '13px', textDecoration: 'none' }}>
            Back to Dashboard
          </Link>
        </header>

        {/* Room Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--sp-4)' }}>
          {rooms.map((r) => (
            <div key={r.id} className="sc-glass-card" style={{ padding: 'var(--sp-5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-2)' }}>
                <h3 style={{ margin: 0, fontSize: '18px' }}>{r.label}</h3>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--r-pill)', background: r.status === 'occupied' ? 'rgba(46,230,168,0.2)' : 'rgba(255,184,77,0.2)', color: r.status === 'occupied' ? 'var(--sc-green)' : 'var(--sc-warn)' }}>
                  {r.status.toUpperCase()}
                </span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--sc-text-muted)', marginBottom: 'var(--sp-3)' }}>
                Tenant: {r.tenant ? r.tenant : 'None'}
              </div>
              <div className="font-mono-data" style={{ fontSize: '20px', color: 'var(--sc-text)' }}>
                Wallet: ₦{r.balance.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
