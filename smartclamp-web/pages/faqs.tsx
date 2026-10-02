import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const FAQS = [
  {
    q: "Does installing a SmartClamp require breaking or cutting my electrical wires?",
    a: "No. SmartClamp uses non-invasive Current Transformer (CT) clamps that simply snap around live un-energized cables without cutting or stripping insulation."
  },
  {
    q: "Does SmartClamp replace my official DisCo utility meter?",
    a: "No. SmartClamp provides sub-metering and verification technology. It does not generate, resell, or distribute electricity, and does not replace your official utility meter."
  },
  {
    q: "How does SmartClamp work if my building has no smart meter at all?",
    a: "In unmetered or no-meter shared housing, each room is equipped with a SmartClamp device. A whole-building reading point tracks total inflow, and a pooled wallet model distributes charges proportionally."
  },
  {
    q: "Can DisCo staff remotely turn off my power without consent?",
    a: "No. Remote utility relay control commands requested by DisCo staff are hard-blocked (403 forbidden) unless you explicitly grant active utility control consent, and every command requires step-up OTP confirmation."
  }
];

export default function FaqsPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--sc-navy)', color: 'var(--sc-text)' }}>
      <Navbar />

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: 'var(--sp-8) var(--sp-4)' }}>
        <header style={{ marginBottom: 'var(--sp-8)', textAlign: 'center' }}>
          <h1 style={{ fontSize: '38px', fontWeight: 700, margin: '0 0 var(--sp-2) 0' }}>
            Frequently Asked Questions
          </h1>
          <p style={{ color: 'var(--sc-text-muted)', fontSize: '16px' }}>
            Everything you need to know about SmartClamp hardware, billing, and security.
          </p>
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          {FAQS.map((faq, idx) => (
            <div key={idx} className="sc-glass-card" style={{ padding: 'var(--sp-6)' }}>
              <h3 style={{ margin: '0 0 var(--sp-2) 0', fontSize: '18px', color: 'var(--sc-green)' }}>
                {faq.q}
              </h3>
              <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6', color: 'var(--sc-text-muted)' }}>
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
