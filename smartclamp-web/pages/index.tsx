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
    <div style={{ minHeight: '100vh', background: 'var(--sc-navy)', color: 'var(--sc-text)', width: '100%', overflowX: 'hidden' }}>
      <Navbar />

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 24px' }}>
        {/* Problem Slider Section */}
        <div className="sc-glass-card sc-animated-entry" style={{ padding: '32px', textAlign: 'center', marginBottom: '64px', borderColor: 'var(--sc-green)' }}>
          <div style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--sc-green)', fontWeight: 700, marginBottom: '12px' }}>
            The Problem We're Solving
          </div>
          <h2 style={{ fontSize: '28px', fontWeight: 800, margin: 0, minHeight: '72px', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: '1.3' }}>
            "{PROBLEM_SLIDES[currentSlide]}"
          </h2>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
            {PROBLEM_SLIDES.map((_, i) => (
              <span
                key={i}
                onClick={() => setCurrentSlide(i)}
                style={{
                  width: '12px', height: '12px', borderRadius: '50%',
                  background: currentSlide === i ? 'var(--sc-green)' : 'var(--sc-slate)',
                  cursor: 'pointer',
                  transition: 'background 300ms ease'
                }}
              />
            ))}
          </div>
        </div>

        {/* Hero Banner */}
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <h1 style={{ fontSize: '56px', fontWeight: 800, margin: '0 0 16px 0', letterSpacing: '-0.02em', lineHeight: '1.1' }}>
            Electricity you can verify, <br />
            <span style={{ color: 'var(--sc-green)' }}>with or without a meter.</span>
          </h1>
          <p style={{ color: 'var(--sc-text-muted)', fontSize: '20px', maxWidth: '720px', margin: '0 auto 32px auto', lineHeight: '1.5' }}>
            Precision hardware clamps & optical IR meter readers for tenants, landlords, homeowners, and DisCos in Nigeria.
          </p>
        </div>

        {/* Persistent Meter Validation Field */}
        <div id="meter-validation" className="sc-glass-card" style={{ maxWidth: '640px', margin: '0 auto 80px auto' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginTop: 0, marginBottom: '8px' }}>
            Instant Meter Validation (Free)
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--sc-text-muted)', marginBottom: '24px' }}>
            Have an existing smart meter? Test your meter number instantly without creating an account.
          </p>

          <form onSubmit={handleValidateMeter} style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <input
                id="meter-input"
                type="text"
                value={meterNumber}
                onChange={(e) => setMeterNumber(e.target.value)}
                placeholder="Enter DisCo meter number (e.g. 0123456789)"
                style={{
                  flex: '1 1 240px',
                  height: '48px',
                  borderRadius: 'var(--r-pill)',
                  background: 'rgba(11, 27, 43, 0.7)',
                  border: '1px solid var(--sc-slate)',
                  color: 'var(--sc-text)',
                  padding: '0 20px',
                  fontSize: '15px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <button type="submit" className="sc-btn-primary" disabled={loading} style={{ flex: '0 0 auto' }}>
                {loading ? 'Checking...' : 'Validate Meter'}
              </button>
            </div>
          </form>

          {result && (
            <div style={{ marginTop: '24px' }}>
              {result.valid ? (
                <div style={{ background: 'rgba(46, 230, 168, 0.12)', border: '1px solid var(--sc-green)', borderRadius: 'var(--r-md)', padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span className="sc-verified-dot" />
                    <span style={{ fontWeight: 700, color: 'var(--sc-green)' }}>Verified Active Customer Record</span>
                  </div>
                  <div style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--sc-text)' }}>
                    <strong>Customer Name:</strong> {result.customer_name}<br />
                    <strong>Address:</strong> {result.address}<br />
                    <strong>DisCo Provider:</strong> {result.disco_name}
                  </div>

                  <p style={{ fontSize: '13px', color: 'var(--sc-text-muted)', marginTop: '12px', marginBottom: '16px' }}>
                    Want live balance and history? Add the free-standing IR-Reader, or sign up to start tracking.
                  </p>

                  {!orderedIr ? (
                    <button onClick={handleOrderIrReader} className="sc-btn-primary" style={{ width: '100%', height: '44px', fontSize: '14px' }}>
                      Order Optical IR-Reader for Live Balance
                    </button>
                  ) : (
                    <div style={{ fontSize: '14px', color: 'var(--sc-green)', fontWeight: 700 }}>
                      ✓ IR-Reader order linked to meter {meterNumber}! Shipping dispatch initiated.
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ background: 'rgba(255, 107, 107, 0.12)', border: '1px solid var(--sc-alert)', borderRadius: 'var(--r-md)', padding: '16px', color: 'var(--sc-alert)', fontWeight: 700 }}>
                  Meter number not found or unreachable.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Live Animated Dashboard Mockup */}
        <section style={{ marginBottom: '80px' }}>
          <h2 style={{ textAlign: 'center', fontSize: '32px', fontWeight: 800, marginBottom: '24px' }}>Live Control Simulator</h2>
          <div className="sc-glass-card" style={{ maxWidth: '720px', margin: '0 auto', borderColor: 'var(--sc-green)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--sc-green)', fontWeight: 700, letterSpacing: '1px' }}>HARDWARE SIMULATOR</div>
                <div style={{ fontWeight: 700, fontSize: '18px' }}>Room 2 — House Full CT Clamp</div>
              </div>
              <button
                onClick={() => { setDemoRelay(!demoRelay); setDemoWatts(demoRelay ? 0 : 1250); }}
                className="sc-btn-primary"
                style={{ height: '40px', padding: '0 16px', fontSize: '13px' }}
              >
                Relay Switch: {demoRelay ? 'CONNECTED (ON)' : 'DISCONNECTED (OFF)'}
              </button>
            </div>

            <div className="sc-grid-2">
              <div style={{ background: 'rgba(11,27,43,0.7)', padding: '20px', borderRadius: 'var(--r-sm)' }}>
                <div style={{ fontSize: '13px', color: 'var(--sc-text-muted)' }}>Real-time Load</div>
                <div className="font-mono-data" style={{ fontSize: '36px', color: demoRelay ? 'var(--sc-green-bright)' : 'var(--sc-text-muted)', marginTop: '4px' }}>
                  {demoWatts} W
                </div>
              </div>
              <div style={{ background: 'rgba(11,27,43,0.7)', padding: '20px', borderRadius: 'var(--r-sm)' }}>
                <div style={{ fontSize: '13px', color: 'var(--sc-text-muted)' }}>Estimated Daily Cost</div>
                <div className="font-mono-data" style={{ fontSize: '36px', color: 'var(--sc-text)', marginTop: '4px' }}>
                  ₦{(demoWatts * 0.024 * 100).toFixed(0)}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works — 4 Steps */}
        <section style={{ marginBottom: '80px' }}>
          <h2 style={{ textAlign: 'center', fontSize: '32px', fontWeight: 800, marginBottom: '32px' }}>How It Works in 4 Steps</h2>
          <div className="sc-grid-4">
            {[
              { step: '1', title: 'Clip it on', desc: 'Attach CT clamp around main wire or place optical IR reader over meter.' },
              { step: '2', title: 'Cloud Sync', desc: 'Telemetry signs HMAC key and streams live to backend.' },
              { step: '3', title: 'See & Control', desc: 'Track live watts, set schedules, budget caps & toggles from your phone.' },
              { step: '4', title: 'Verified Bill', desc: 'Generate signed statements to prevent disputes and split costs fairly.' }
            ].map((s) => (
              <div key={s.step} className="sc-glass-card">
                <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--sc-green)', marginBottom: '8px' }}>0{s.step}</div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 700 }}>{s.title}</h3>
                <p style={{ fontSize: '13px', color: 'var(--sc-text-muted)', lineHeight: '1.6', margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--sc-text-muted)' }}>
            Already have a smart meter? <a href="#meter-validation" style={{ color: 'var(--sc-green)', textDecoration: 'none', fontWeight: 700 }}>Try it free above</a>
          </div>
        </section>

        {/* Who It's For — Segmented Cards */}
        <section style={{ marginBottom: '80px' }}>
          <h2 style={{ textAlign: 'center', fontSize: '32px', fontWeight: 800, marginBottom: '32px' }}>Who It's Built For</h2>
          <div className="sc-grid-3">
            <div className="sc-glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ marginTop: 0, fontSize: '22px', fontWeight: 700 }}>Shared Housing & Landlords</h3>
                <p style={{ fontSize: '14px', color: 'var(--sc-text-muted)', lineHeight: '1.6', marginBottom: '20px' }}>
                  Individual wallets per room or whole-building pooled wallets. Vacate rooms seamlessly and prevent tenant bill disputes.
                </p>
              </div>
              <Link href="/landlords" className="sc-btn-primary" style={{ width: '100%' }}>
                Learn For Landlords
              </Link>
            </div>

            <div className="sc-glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ marginTop: 0, fontSize: '22px', fontWeight: 700 }}>Single Homeowners</h3>
                <p style={{ fontSize: '14px', color: 'var(--sc-text-muted)', lineHeight: '1.6', marginBottom: '20px' }}>
                  Monitor solar vs grid balance, detect voltage anomalies, and track appliance load signatures.
                </p>
              </div>
              <Link href="/homeowners" className="sc-btn-primary" style={{ width: '100%' }}>
                Learn For Homeowners
              </Link>
            </div>

            <div className="sc-glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ marginTop: 0, fontSize: '22px', fontWeight: 700 }}>Existing Smart Meters</h3>
                <p style={{ fontSize: '14px', color: 'var(--sc-text-muted)', lineHeight: '1.6', marginBottom: '20px' }}>
                  No clamp needed. Validate your meter or order an optical IR reader to unlock real-time tracking.
                </p>
              </div>
              <a href="#meter-validation" className="sc-btn-primary" style={{ width: '100%' }}>
                Try Free Validation
              </a>
            </div>
          </div>
        </section>

        {/* Trust Strip & Social Proof */}
        <section style={{ marginBottom: '80px' }}>
          <div className="sc-glass-card" style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '20px', fontWeight: 700, fontSize: '15px' }}>
              <div>⚡ 3-Minute Clamp Install</div>
              <div>🛡️ 5-Layer Theft & Tamper Detection</div>
              <div>🔌 Works With or Without Meter</div>
              <div>📜 No NEPA Cooperation Required</div>
            </div>
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--sc-slate)', color: 'var(--sc-text-muted)', fontSize: '14px' }}>
              📍 <strong>Piloting now in the FUTA area</strong> — results coming soon.
            </div>
          </div>
        </section>

        {/* Pricing Preview Section */}
        <section style={{ marginBottom: '80px' }}>
          <h2 style={{ textAlign: 'center', fontSize: '32px', fontWeight: 800, marginBottom: '32px' }}>Pricing Plans</h2>
          <div className="sc-grid-4">
            <div className="sc-glass-card">
              <h3 style={{ marginTop: 0 }}>Free</h3>
              <div className="font-mono-data" style={{ fontSize: '32px', color: 'var(--sc-green)', margin: '12px 0' }}>₦0</div>
              <p style={{ fontSize: '13px', color: 'var(--sc-text-muted)', lineHeight: '1.6' }}>
                Instant meter validation & room invite links. No clamp needed.
              </p>
            </div>

            <div className="sc-glass-card">
              <h3 style={{ marginTop: 0 }}>Basic</h3>
              <div className="font-mono-data" style={{ fontSize: '32px', color: 'var(--sc-green)', margin: '12px 0' }}>₦1,500<span style={{ fontSize: '14px' }}>/mo</span></div>
              <p style={{ fontSize: '13px', color: 'var(--sc-text-muted)', lineHeight: '1.6' }}>
                Live watts telemetry & outage notifications.
              </p>
            </div>

            <div className="sc-glass-card" style={{ borderColor: 'var(--sc-green)' }}>
              <h3 style={{ marginTop: 0, color: 'var(--sc-green)' }}>Basic Pro</h3>
              <div className="font-mono-data" style={{ fontSize: '32px', color: 'var(--sc-green-bright)', margin: '12px 0' }}>₦3,500<span style={{ fontSize: '14px' }}>/mo</span></div>
              <p style={{ fontSize: '13px', color: 'var(--sc-text-muted)', lineHeight: '1.6' }}>
                Appliance load signatures, power factor & undersupply credit statements.
              </p>
            </div>

            <div className="sc-glass-card">
              <h3 style={{ marginTop: 0 }}>Pro / Landlord</h3>
              <div className="font-mono-data" style={{ fontSize: '32px', color: 'var(--sc-green)', margin: '12px 0' }}>Custom</div>
              <p style={{ fontSize: '13px', color: 'var(--sc-text-muted)', lineHeight: '1.6' }}>
                Remote relay control, step-up OTP security & portfolio management.
              </p>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section>
          <div className="sc-glass-card" style={{ textAlign: 'center', borderColor: 'var(--sc-green)', padding: '48px 24px' }}>
            <h2 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 16px 0' }}>Ready to take control of your energy?</h2>
            <p style={{ color: 'var(--sc-text-muted)', fontSize: '16px', maxWidth: '520px', margin: '0 auto 32px auto' }}>
              Join hundreds of tenants, landlords, and homeowners taking the friction out of electricity billing.
            </p>
            <Link href="/signup" className="sc-btn-primary" style={{ minWidth: '220px' }}>
              Create Account Now
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
