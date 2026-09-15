import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../../../components/Navbar';
import Footer from '../../../components/Footer';
import Link from 'next/link';

export default function DisputeDetailPage() {
  const router = useRouter();
  const { dispute_id } = router.query;
  const [negotiationNote, setNegotiationNote] = useState('');
  const [history, setHistory] = useState<string[]>([
    'Dispute submitted by Tenant: "I was away on holiday August 10-20."',
    'Landlord response: "Checking whole-building total meter log."'
  ]);

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!negotiationNote.trim()) return;
    setHistory([...history, `Counter Note: "${negotiationNote.trim()}"`]);
    setNegotiationNote('');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--sc-navy)', color: 'var(--sc-text)' }}>
      <Navbar />

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: 'var(--sp-8) var(--sp-4)' }}>
        <header style={{ marginBottom: 'var(--sp-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0 }}>
              Dispute Detail: {dispute_id}
            </h1>
            <p style={{ color: 'var(--sc-text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>
              Visual telemetry timeline, bill breakdown & negotiation room
            </p>
          </div>
          <Link href={`/disputes/${dispute_id}/meeting-view`} className="sc-btn-primary" style={{ display: 'inline-block', lineHeight: '40px', height: '40px', fontSize: '13px', textDecoration: 'none' }}>
            Switch to Meeting Mode View 🔍
          </Link>
        </header>

        {/* Visual Usage Timeline Chart Card */}
        <div className="sc-glass-card" style={{ padding: 'var(--sp-6)', marginBottom: 'var(--sp-6)' }}>
          <h2 style={{ marginTop: 0, fontSize: '20px', color: 'var(--sc-green)' }}>Visual Usage Timeline (August 2026)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--sp-3)', marginTop: 'var(--sp-4)' }}>
            <div style={{ background: 'rgba(11,27,43,0.6)', padding: 'var(--sp-3)', borderRadius: 'var(--r-sm)', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: 'var(--sc-text-muted)' }}>Aug 1 - Aug 7</div>
              <div className="font-mono-data" style={{ fontSize: '20px', color: 'var(--sc-text)', marginTop: '4px' }}>42.5 kWh</div>
            </div>
            <div style={{ background: 'rgba(46,230,168,0.1)', border: '1px solid var(--sc-green)', padding: 'var(--sp-3)', borderRadius: 'var(--r-sm)', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: 'var(--sc-green)' }}>Aug 8 - Aug 14 (Away)</div>
              <div className="font-mono-data" style={{ fontSize: '20px', color: 'var(--sc-green-bright)', marginTop: '4px' }}>1.2 kWh</div>
            </div>
            <div style={{ background: 'rgba(46,230,168,0.1)', border: '1px solid var(--sc-green)', padding: 'var(--sp-3)', borderRadius: 'var(--r-sm)', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: 'var(--sc-green)' }}>Aug 15 - Aug 21 (Away)</div>
              <div className="font-mono-data" style={{ fontSize: '20px', color: 'var(--sc-green-bright)', marginTop: '4px' }}>1.0 kWh</div>
            </div>
            <div style={{ background: 'rgba(11,27,43,0.6)', padding: 'var(--sp-3)', borderRadius: 'var(--r-sm)', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: 'var(--sc-text-muted)' }}>Aug 22 - Aug 31</div>
              <div className="font-mono-data" style={{ fontSize: '20px', color: 'var(--sc-text)', marginTop: '4px' }}>58.3 kWh</div>
            </div>
          </div>
        </div>

        {/* Negotiation Stream & Note Submission */}
        <div className="sc-glass-card" style={{ padding: 'var(--sp-6)' }}>
          <h2 style={{ marginTop: 0, fontSize: '20px' }}>Negotiation Log & Evidence</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', margin: 'var(--sp-4) 0' }}>
            {history.map((item, idx) => (
              <div key={idx} style={{ background: 'rgba(11,27,43,0.6)', padding: 'var(--sp-3)', borderRadius: 'var(--r-sm)', fontSize: '14px', color: 'var(--sc-text)' }}>
                {item}
              </div>
            ))}
          </div>

          <form onSubmit={handleAddNote} style={{ display: 'flex', gap: 'var(--sp-3)', marginTop: 'var(--sp-4)' }}>
            <input
              type="text"
              placeholder="Add note or proposed settlement figure..."
              value={negotiationNote}
              onChange={(e) => setNegotiationNote(e.target.value)}
              style={{ flex: 1, height: '48px', borderRadius: 'var(--r-pill)', background: 'rgba(11,27,43,0.8)', border: '1px solid var(--sc-slate)', color: 'var(--sc-text)', padding: '0 var(--sp-4)' }}
            />
            <button type="submit" className="sc-btn-primary">Post Note</button>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
