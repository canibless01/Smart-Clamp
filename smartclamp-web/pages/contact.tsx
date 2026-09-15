import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--sc-navy)', color: 'var(--sc-text)' }}>
      <Navbar />

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: 'var(--sp-8) var(--sp-4)' }}>
        <header style={{ marginBottom: 'var(--sp-8)', textAlign: 'center' }}>
          <h1 style={{ fontSize: '38px', fontWeight: 700, margin: '0 0 var(--sp-2) 0' }}>
            Contact & Support
          </h1>
          <p style={{ color: 'var(--sc-text-muted)', fontSize: '16px' }}>
            Have questions about SmartClamp hardware, installations, or DisCo integration?
          </p>
        </header>

        <div className="sc-glass-card" style={{ padding: 'var(--sp-6)' }}>
          {!submitted ? (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
              <div>
                <label style={{ fontSize: '13px', color: 'var(--sc-text-muted)', display: 'block', marginBottom: '6px' }}>Your Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Adebayo Ogunlesi"
                  style={{ width: '100%', height: '48px', borderRadius: 'var(--r-pill)', background: 'rgba(11,27,43,0.8)', border: '1px solid var(--sc-slate)', color: 'var(--sc-text)', padding: '0 var(--sp-4)', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', color: 'var(--sc-text-muted)', display: 'block', marginBottom: '6px' }}>Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  style={{ width: '100%', height: '48px', borderRadius: 'var(--r-pill)', background: 'rgba(11,27,43,0.8)', border: '1px solid var(--sc-slate)', color: 'var(--sc-text)', padding: '0 var(--sp-4)', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', color: 'var(--sc-text-muted)', display: 'block', marginBottom: '6px' }}>Message</label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="How can we help you?"
                  style={{ width: '100%', borderRadius: 'var(--r-sm)', background: 'rgba(11,27,43,0.8)', border: '1px solid var(--sc-slate)', color: 'var(--sc-text)', padding: 'var(--sp-3)', boxSizing: 'border-box', resize: 'none' }}
                />
              </div>

              <button type="submit" className="sc-btn-primary">Send Message</button>
            </form>
          ) : (
            <div style={{ textAlign: 'center', padding: 'var(--sp-6)' }}>
              <span className="sc-verified-dot" style={{ width: '18px', height: '18px', marginBottom: 'var(--sp-3)' }} />
              <h2 style={{ color: 'var(--sc-green)', margin: '0 0 var(--sp-2) 0' }}>Message Received</h2>
              <p style={{ color: 'var(--sc-text-muted)', margin: 0 }}>Thank you for reaching out! Our support team will get back to you shortly.</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
