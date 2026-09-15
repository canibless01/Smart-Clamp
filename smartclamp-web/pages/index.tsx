import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { fetchWithAuth } from '../lib/api';

interface MeterValidationResult {
  valid: boolean;
  customer_name?: string;
  address?: string;
  disco_name?: string;
  provider_name?: string;
}

const PROBLEM_SLIDES = [
  "Why should you pay the same as your neighbor's fridge?",
  "Unmetered shared housing leads to constant electricity disputes.",
  "Estimated billing from DisCos shouldn't drain your monthly budget.",
  "Get transparent, verifiable power consumption for every room."
];

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [meterNumber, setMeterNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MeterValidationResult | null>(null);
  const [orderedIr, setOrderedIr] = useState(false);

  // Live Demo Mockup State
  const [demoWatts, setDemoWatts] = useState(1250);
  const [demoRelay, setDemoRelay] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % PROBLEM_SLIDES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleValidateMeter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meterNumber.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await fetchWithAuth('/api/v1/meters/validate', {
        method: 'POST',
        body: JSON.stringify({ meter_number: meterNumber.trim(), utility_type: 'electricity' }),
      });
      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error('Validation error:', err);
      setResult({ valid: false });
    } finally {
      setLoading(false);
    }
  };

  const handleOrderIrReader = async () => {
    if (!meterNumber) return;
    try {
      const res = await fetchWithAuth('/api/v1/meters/link', {
        method: 'POST',
        body: JSON.stringify({ meter_number: meterNumber, disco_name: result?.disco_name || 'EKEDC' })
      });
      if (res.ok) {
        setOrderedIr(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--sc-navy)', color: 'var(--sc-text)' }}>
      <Navbar />

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: 'var(--sp-8) var(--sp-4)' }}>
        {/* Problem Slider Section */}
        <div className="sc-glass-card" style={{ padding: 'var(--sp-6)', textAlign: 'center', marginBottom: 'var(--sp-8)', borderColor: 'var(--sc-green)' }}>
          <div style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--sc-green)', fontWeight: 600, marginBottom: '8px' }}>
            The Problem We're Solving
          </div>
          <h2 style={{ fontSize: '26px', fontWeight: 700, margin: 0, minHeight: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            "{PROBLEM_SLIDES[currentSlide]}"
          </h2>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: 'var(--sp-4)' }}>
            {PROBLEM_SLIDES.map((_, i) => (
              <span
                key={i}
                onClick={() => setCurrentSlide(i)}
                style={{
                  width: '10px', height: '10px', borderRadius: '50%',
                  background: currentSlide === i ? 'var(--sc-green)' : 'var(--sc-slate)',
                  cursor: 'pointer'
                }}
              />
            ))}
          </div>
        </div>

        {/* Hero Banner */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--sp-8)' }}>
          <h1 style={{ fontSize: '52px', fontWeight: 700, margin: '0 0 var(--sp-3) 0', letterSpacing: '-0.02em', lineHeight: '1.1' }}>
            Electricity you can verify, <br />
            <span style={{ color: 'var(--sc-green)' }}>with or without a meter.</span>
          </h1>
          <p style={{ color: 'var(--sc-text-muted)', fontSize: '20px', maxWidth: '680px', margin: '0 auto var(--sp-6) auto' }}>
            Precision hardware clamps & optical IR meter readers for tenants, landlords, homeowners, and DisCos in Nigeria.
          </p>
        </div>

        {/* Persistent Meter Validation Field (Single most important conversion point) */}
        <div id="meter-validation" className="sc-glass-card" style={{ maxWidth: '580px', margin: '0 auto var(--sp-10) auto', padding: 'var(--sp-6)' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 600, marginTop: 0, marginBottom: 'var(--sp-2)' }}>
            Instant Meter Validation (Free)
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--sc-text-muted)', marginBottom: 'var(--sp-4)' }}>
            Have an existing smart meter? Test your meter number instantly without creating an account.
          </p>

          <form onSubmit={handleValidateMeter} style={{ display: 'flex', gap: 'var(--sp-3)', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
              <input
                id="meter-input"
                type="text"
                value={meterNumber}
                onChange={(e) => setMeterNumber(e.target.value)}
                placeholder="Enter DisCo meter number (e.g. 0123456789)"
                style={{
                  flex: 1,
                  height: '48px',
                  borderRadius: 'var(--r-pill)',
                  background: 'rgba(11, 27, 43, 0.6)',
                  border: '1px solid var(--sc-slate)',
                  color: 'var(--sc-text)',
                  padding: '0 var(--sp-4)',
                  fontSize: '16px',
                  outline: 'none'
                }}
              />
              <button type="submit" className="sc-btn-primary" disabled={loading}>
                {loading ? 'Checking...' : 'Validate'}
              </button>
            </div>
          </form>

          {result && (
            <div style={{ marginTop: 'var(--sp-6)' }}>
              {result.valid ? (
                <div style={{ background: 'rgba(46, 230, 168, 0.1)', border: '1px solid var(--sc-green)', borderRadius: 'var(--r-md)', padding: 'var(--sp-5)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-2)' }}>
                    <span className="sc-verified-dot" />
                    <span style={{ fontWeight: 600, color: 'var(--sc-green)' }}>Verified Active Customer Record</span>
                  </div>
                  <div style={{ fontSize: '15px', lineHeight: '1.6' }}>
                    <strong>Customer Name:</strong> {result.customer_name}<br />
                    <strong>Address:</strong> {result.address}<br />
                    <strong>DisCo Provider:</strong> {result.disco_name}
                  </div>

                  <p style={{ fontSize: '12px', color: 'var(--sc-text-muted)', marginTop: 'var(--sp-3)', marginBottom: '0' }}>
                    Want live balance and history? Add the free-standing IR-Reader, or sign up to start tracking.
                  </p>

                  {!orderedIr ? (
                    <button onClick={handleOrderIrReader} className="sc-btn-primary" style={{ width: '100%', marginTop: 'var(--sp-4)', height: '42px', fontSize: '14px' }}>
                      Order Optical IR-Reader for Live Balance
                    </button>
                  ) : (
                    <div style={{ marginTop: 'var(--sp-3)', fontSize: '13px', color: 'var(--sc-green)', fontWeight: 600 }}>
                      ✓ IR-Reader order linked to meter {meterNumber}! Shipping dispatch initiated.
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ background: 'rgba(255, 107, 107, 0.1)', border: '1px solid var(--sc-alert)', borderRadius: 'var(--r-md)', padding: 'var(--sp-4)', color: 'var(--sc-alert)', fontWeight: 600 }}>
                  Meter number not found or unreachable.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Live Animated Dashboard Mockup */}
        <section style={{ marginBottom: 'var(--sp-10)' }}>
          <h2 style={{ textAlign: 'center', fontSize: '28px', marginBottom: 'var(--sp-6)' }}>Live Control Demo</h2>
          <div className="sc-glass-card" style={{ maxWidth: '700px', margin: '0 auto', padding: 'var(--sp-6)', borderColor: 'var(--sc-green)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-4)' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--sc-text-muted)' }}>MOCKUP SIMULATOR</div>
                <div style={{ fontWeight: 600, fontSize: '18px' }}>Room 2 — Main Clamp Telemetry</div>
              </div>
              <button
                onClick={() => { setDemoRelay(!demoRelay); setDemoWatts(demoRelay ? 0 : 1250); }}
                className="sc-btn-primary"
                style={{ height: '36px', padding: '0 16px', fontSize: '13px' }}
              >
                Relay Switch: {demoRelay ? 'CONNECTED (ON)' : 'DISCONNECTED (OFF)'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' }}>
              <div style={{ background: 'rgba(11,27,43,0.6)', padding: 'var(--sp-4)', borderRadius: 'var(--r-sm)' }}>
                <div style={{ fontSize: '13px', color: 'var(--sc-text-muted)' }}>Real-time Load</div>
                <div className="font-mono-data" style={{ fontSize: '32px', color: demoRelay ? 'var(--sc-green-bright)' : 'var(--sc-text-muted)', marginTop: '4px' }}>
                  {demoWatts} W
                </div>
              </div>
              <div style={{ background: 'rgba(11,27,43,0.6)', padding: 'var(--sp-4)', borderRadius: 'var(--r-sm)' }}>
                <div style={{ fontSize: '13px', color: 'var(--sc-text-muted)' }}>Estimated Daily Cost</div>
                <div className="font-mono-data" style={{ fontSize: '32px', color: 'var(--sc-text)', marginTop: '4px' }}>
                  ₦{(demoWatts * 0.024 * 100).toFixed(0)}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works — 4 Steps */}
        <section style={{ marginBottom: 'var(--sp-10)' }}>
          <h2 style={{ textAlign: 'center', fontSize: '32px', marginBottom: 'var(--sp-8)' }}>How It Works in 4 Steps</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 'var(--sp-4)' }}>
            {[
              { step: '1', title: 'Clip it on', desc: 'Attach CT clamp around main wire or place optical IR reader over meter.' },
              { step: '2', title: 'Cloud Sync', desc: 'Telemetry signs HMAC key and streams live to backend.' },
              { step: '3', title: 'See & Control', desc: 'Track live watts, set schedules, budget caps & toggles from your phone.' },
              { step: '4', title: 'Verified Bill', desc: 'Generate signed statements to prevent disputes and split costs fairly.' }
            ].map((s) => (
              <div key={s.step} className="sc-glass-card" style={{ padding: 'var(--sp-5)' }}>
                <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--sc-green)', marginBottom: '8px' }}>0{s.step}</div>
                <h3 style={{ margin: '0 0 var(--sp-2) 0', fontSize: '18px' }}>{s.title}</h3>
                <p style={{ fontSize: '13px', color: 'var(--sc-text-muted)', lineHeight: '1.5', margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 'var(--sp-4)', fontSize: '14px', color: 'var(--sc-text-muted)' }}>
            Already have a smart meter? <a href="#meter-validation" style={{ color: 'var(--sc-green)', textDecoration: 'none', fontWeight: 600 }}>Try it free above</a>
          </div>
        </section>

        {/* Who It's For — Segmented Cards */}
        <section style={{ marginBottom: 'var(--sp-10)' }}>
          <h2 style={{ textAlign: 'center', fontSize: '32px', marginBottom: 'var(--sp-8)' }}>Who It's Built For</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--sp-5)' }}>
            <div className="sc-glass-card" style={{ padding: 'var(--sp-6)' }}>
              <h3 style={{ marginTop: 0, fontSize: '22px' }}>Shared Housing & Landlords</h3>
              <p style={{ fontSize: '14px', color: 'var(--sc-text-muted)', lineHeight: '1.6' }}>
                Individual wallets per room or whole-building pooled wallets. Vacate rooms seamlessly and prevent tenant bill disputes.
              </p>
              <Link href="/landlords" className="sc-btn-primary" style={{ display: 'inline-block', lineHeight: '48px', textDecoration: 'none', textAlign: 'center', width: '100%', marginTop: 'var(--sp-4)' }}>
                Learn For Landlords
              </Link>
            </div>

            <div className="sc-glass-card" style={{ padding: 'var(--sp-6)' }}>
              <h3 style={{ marginTop: 0, fontSize: '22px' }}>Single Homeowners</h3>
              <p style={{ fontSize: '14px', color: 'var(--sc-text-muted)', lineHeight: '1.6' }}>
                Monitor solar vs grid balance, detect voltage anomalies, and track appliance load signatures.
              </p>
              <Link href="/homeowners" className="sc-btn-primary" style={{ display: 'inline-block', lineHeight: '48px', textDecoration: 'none', textAlign: 'center', width: '100%', marginTop: 'var(--sp-4)' }}>
                Learn For Homeowners
              </Link>
            </div>

            <div className="sc-glass-card" style={{ padding: 'var(--sp-6)' }}>
              <h3 style={{ marginTop: 0, fontSize: '22px' }}>Existing Smart Meters</h3>
              <p style={{ fontSize: '14px', color: 'var(--sc-text-muted)', lineHeight: '1.6' }}>
                No clamp needed. Validate your meter or order an optical IR reader to unlock real-time tracking.
              </p>
              <a href="#meter-validation" className="sc-btn-primary" style={{ display: 'inline-block', lineHeight: '48px', textDecoration: 'none', textAlign: 'center', width: '100%', marginTop: 'var(--sp-4)' }}>
                Try Free Validation
              </a>
            </div>
          </div>
        </section>

        {/* Trust Strip & Social Proof */}
        <section style={{ marginBottom: 'var(--sp-10)' }}>
          <div className="sc-glass-card" style={{ padding: 'var(--sp-6)', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 'var(--sp-4)', fontWeight: 600, fontSize: '15px' }}>
              <div>⚡ 3-Minute Clamp Install</div>
              <div>🛡️ 5-Layer Theft & Tamper Detection</div>
              <div>🔌 Works With or Without Meter</div>
              <div>📜 No NEPA Cooperation Required</div>
            </div>
            <div style={{ marginTop: 'var(--sp-6)', paddingTop: 'var(--sp-4)', borderTop: '1px solid var(--sc-slate)', color: 'var(--sc-text-muted)', fontSize: '14px' }}>
              📍 <strong>Piloting now in the FUTA area</strong> — results coming soon.
            </div>
          </div>
        </section>

        {/* Pricing Preview Section */}
        <section style={{ marginBottom: 'var(--sp-10)' }}>
          <h2 style={{ textAlign: 'center', fontSize: '32px', marginBottom: 'var(--sp-8)' }}>Pricing Plans</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 'var(--sp-4)' }}>
            <div className="sc-glass-card" style={{ padding: 'var(--sp-5)' }}>
              <h3 style={{ marginTop: 0 }}>Free</h3>
              <div className="font-mono-data" style={{ fontSize: '28px', color: 'var(--sc-green)' }}>₦0</div>
              <p style={{ fontSize: '13px', color: 'var(--sc-text-muted)', lineHeight: '1.6', marginTop: 'var(--sp-3)' }}>
                Instant meter validation & room invite links. No clamp needed.
              </p>
            </div>

            <div className="sc-glass-card" style={{ padding: 'var(--sp-5)' }}>
              <h3 style={{ marginTop: 0 }}>Basic</h3>
              <div className="font-mono-data" style={{ fontSize: '28px', color: 'var(--sc-green)' }}>₦1,500<span style={{ fontSize: '14px' }}>/mo</span></div>
              <p style={{ fontSize: '13px', color: 'var(--sc-text-muted)', lineHeight: '1.6', marginTop: 'var(--sp-3)' }}>
                Live watts telemetry & outage notifications.
              </p>
            </div>

            <div className="sc-glass-card" style={{ padding: 'var(--sp-5)', borderColor: 'var(--sc-green)' }}>
              <h3 style={{ marginTop: 0, color: 'var(--sc-green)' }}>Basic Pro</h3>
              <div className="font-mono-data" style={{ fontSize: '28px', color: 'var(--sc-green-bright)' }}>₦3,500<span style={{ fontSize: '14px' }}>/mo</span></div>
              <p style={{ fontSize: '13px', color: 'var(--sc-text-muted)', lineHeight: '1.6', marginTop: 'var(--sp-3)' }}>
                Appliance load signatures, power factor & undersupply credit statements.
              </p>
            </div>

            <div className="sc-glass-card" style={{ padding: 'var(--sp-5)' }}>
              <h3 style={{ marginTop: 0 }}>Pro / Landlord</h3>
              <div className="font-mono-data" style={{ fontSize: '28px', color: 'var(--sc-green)' }}>Custom</div>
              <p style={{ fontSize: '13px', color: 'var(--sc-text-muted)', lineHeight: '1.6', marginTop: 'var(--sp-3)' }}>
                Remote relay control, step-up OTP security & portfolio management.
              </p>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section>
          <div className="sc-glass-card" style={{ padding: 'var(--sp-8)', textAlign: 'center', borderColor: 'var(--sc-green)' }}>
            <h2 style={{ fontSize: '32px', margin: '0 0 var(--sp-3) 0' }}>Ready to take control of your energy?</h2>
            <p style={{ color: 'var(--sc-text-muted)', fontSize: '16px', maxWidth: '500px', margin: '0 auto var(--sp-6) auto' }}>
              Join hundreds of tenants, landlords, and homeowners taking the friction out of electricity billing.
            </p>
            <Link href="/signup" className="sc-btn-primary" style={{ display: 'inline-block', lineHeight: '48px', textDecoration: 'none' }}>
              Create Account Now
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
