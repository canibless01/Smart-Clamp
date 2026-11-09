import PublicShell from '@/components/PublicShell'
export default function Page(){
  const faqs=[
    {q:'Does SmartClamp replace my NEPA meter?',a:'No. SmartClamp provides sub-metering and verification technology. It does not generate, resell or distribute electricity and does not replace your utility meter.'},
    {q:'Do you need power to report power loss?',a:'A small supercapacitor stores enough for a bounded final save (power-fail interrupt → persist to pre-erased reserved slot with CRC). It does not guarantee a cellular SMS before shutdown — best effort only. No battery means no promise of SMS while unpowered.'},
    {q:'Can my landlord cut my power for unpaid rent?',a:'No. Landlords cannot use power control to enforce rent debts. Bulk maintenance requires reason, scope, expiry (default 30 min), step-up and audit. Remote utility control requires consent, authority, scope and dispatch checks.'},
    {q:'Is my data private?',a:'Yes. Public projections are masked and rate-limited. Private reports use opaque revocable scoped tokens. No addresses/phones in public views. Anonymous meter validation with rate limits and approved masking.'},
    {q:'How accurate is the measurement?',a:'True watts via mean(v·i) over whole cycles, phase calibration, RMS over correct windows. "V×I = real watts" is apparent VA; we separate VA/PF. Calibration per CT/modulemodel required — no universal accuracy claim without bench qualification.'},
    {q:'What if my device goes offline?',a:'Three missed 60s heartbeats → stale at 180s; 24h triggers offline notice. Local sensing/protection continue. Bounded journal retains records; overflow marks data_loss. No zero-wallet assumption during disconnect. Delayed-accounting exposure shown.'},
  ]
  return <PublicShell>
    <div className="container" style={{padding:'32px 0',maxWidth:800}}>
      <h1 style={{color:'var(--navy)'}}>FAQs</h1>
      <div style={{marginTop:16,display:'grid',gap:12}}>
        {faqs.map((f,i)=>(
          <details key={i} className="card" style={{cursor:'pointer'}}>
            <summary style={{fontWeight:700,listStyle:'none',display:'flex',justifyContent:'space-between'}}><span>{f.q}</span><span style={{color:'var(--muted)'}}>▾</span></summary>
            <p style={{color:'var(--muted)',marginTop:12}}>{f.a}</p>
          </details>
        ))}
      </div>
      <div style={{marginTop:24,display:'flex',gap:8}}>
        <a href="/connection-help" className="btn btn-primary">Connection help</a>
        <a href="/support" className="btn btn-secondary">Contact support</a>
        <a href="/terms" className="btn btn-secondary">Terms</a>
      </div>
      <div style={{fontSize:12,color:'var(--muted)',marginTop:12}}>No fabricated testimonials, certifications or universal meter compatibility claim. All claims require stated period/sample/source + permission.</div>
    </div>
  </PublicShell>
}
