import React, { useState } from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import Link from 'next/link';

interface DisputeItem {
  id: string;
  period: string;
  amount_naira: number;
  status: 'open' | 'under_review' | 'resolved';
  reason: string;
}

export default function DisputeCenterIndex() {
  const [disputes] = useState<DisputeItem[]>([
    { id: 'DISP-8921', period: 'August 2026', amount_naira: 14500, status: 'open', reason: 'Unusually high surge during travel period' },
    { id: 'DISP-7410', period: 'July 2026', amount_naira: 12000, status: 'resolved', reason: 'Estimated DisCo tariff mismatch' }
  ]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--sc-navy)', color: 'var(--sc-text)' }}>
      <Navbar />

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: 'var(--sp-8) var(--sp-4)' }}>
        <header style={{ marginBottom: 'var(--sp-8)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 700, margin: 0 }}>
              Dispute Center
            </h1>
            <p style={{ color: 'var(--sc-text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>
              Challenge bill discrepancies with cryptographic usage evidence & negotiation flows
            </p>
          </div>
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          {disputes.map((d) => (
            <div key={d.id} className="sc-glass-card" style={{ padding: 'var(--sp-5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', marginBottom: 'var(--sp-2)' }}>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--sc-text)' }}>{d.id}</span>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 'var(--r-pill)',
                    background: d.status === 'open' ? 'rgba(255, 184, 77, 0.2)' : 'rgba(46, 230, 168, 0.2)',
                    color: d.status === 'open' ? 'var(--sc-warn)' : 'var(--sc-green)'
                  }}>
                    {d.status.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--sc-text-muted)' }}>
                  Period: {d.period} · Issue: {d.reason}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div className="font-mono-data" style={{ fontSize: '20px', color: 'var(--sc-text)', fontWeight: 600 }}>
                  ₦{d.amount_naira.toLocaleString()}
                </div>
                <Link href={`/disputes/${d.id}`} style={{ fontSize: '13px', color: 'var(--sc-green)', textDecoration: 'none', fontWeight: 600, display: 'inline-block', marginTop: '6px' }}>
                  Open Detail & Negotiation →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
