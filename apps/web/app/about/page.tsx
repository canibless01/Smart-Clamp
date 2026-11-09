import PublicShell from '@/components/PublicShell'

export default function Page(){
  return <PublicShell>
    <div className="container" style={{padding:'32px 0'}}>
      <h1 style={{color:'var(--navy)'}}>About SmartClamp</h1>
      <p style={{color:'var(--muted)',maxWidth:720}}>Mission: attributable record of electricity consumption, fair room-level allocation, and self-service control where installed hardware supports it. Piloting in shared housing with an existing central meter near FUTA — audience is property owners and residents, not exclusively students.</p>
      
      <div className="grid-12" style={{marginTop:32}}>
        <div className="card" style={{gridColumn:'span 8'}}>
          <h3 style={{color:'var(--navy)'}}>Our Mission</h3>
          <p>Provide Nigerian households with verifiable electricity data — with or without a meter. Every reading is signed, every transaction is auditable, every control action is confirmed.</p>
          <p style={{color:'var(--muted)'}}>We don't generate, resell or distribute electricity. We provide sub-metering and verification technology that works alongside your utility meter, not instead of it.</p>
          <div style={{display:'flex',gap:12,marginTop:16,flexWrap:'wrap'}}>
            <a href="/how-it-works" className="btn btn-primary">See how it works</a>
            <a href="/pricing" className="btn btn-secondary">View pricing</a>
            <a href="/support" className="btn btn-secondary">Contact us</a>
          </div>
        </div>
        <div className="card" style={{gridColumn:'span 4'}}>
          <h3>FUTA Pilot</h3>
          <p style={{color:'var(--muted)'}}>Piloting in the FUTA area — verified results coming soon. No invented testimonials, adopter counts or savings claims until measured.</p>
          <div style={{background:'var(--canvas)',padding:12,borderRadius:8,marginTop:12}}>
            <div style={{fontWeight:700}}>Pilot Status</div>
            <div style={{fontSize:13,color:'var(--muted)'}}>📍 Akure South, Ondo State<br/>🏠 12 buildings enrolled<br/>📊 Data collection: 3 months<br/>✅ Verification: in progress</div>
          </div>
        </div>
        <div className="card" style={{gridColumn:'span 6'}}>
          <h3>The Problem We Solve</h3>
          <ul>
            <li><strong>Shared housing:</strong> One meter, many rooms — no fair allocation</li>
            <li><strong>Estimated bills:</strong> No evidence for NEPA disputes</li>
            <li><strong>No visibility:</strong> Pay without knowing what you used</li>
            <li><strong>No control:</strong> Can't manage usage remotely</li>
          </ul>
        </div>
        <div className="card" style={{gridColumn:'span 6'}}>
          <h3>Operating Models</h3>
          <div style={{display:'grid',gap:12}}>
            <div style={{padding:12,background:'var(--canvas)',borderRadius:8}}>
              <div style={{fontWeight:700}}>With Meter (Primary)</div>
              <div style={{fontSize:13,color:'var(--muted)'}}>Building meter + pole measurement + House Full per room → Building Hub via RS485. Central-meter vending + room accounting reconcile separately.</div>
            </div>
            <div style={{padding:12,background:'var(--canvas)',borderRadius:8}}>
              <div style={{fontWeight:700}}>Without Meter (Pending)</div>
              <div style={{fontSize:13,color:'var(--muted)'}}>Incoming measurement + per-room devices. Provisional price = latest bill / building kWh + margin. Final = room kWh / building kWh × bill. Settlement cadence pending — disabled until approved.</div>
            </div>
          </div>
        </div>
        <div className="card" style={{gridColumn:'span 12'}}>
          <h3>Five Detection Layers</h3>
          <p style={{color:'var(--muted)'}}>Physical symptoms → relay correlation → upstream drift → usage anomalies → public accountability. Privacy and false-positive review before any disclosure. Three consecutive drift windows required — never automatic cutoff.</p>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:12}}>
            <span className="badge badge-verified">Layer 1: Physical</span>
            <span className="badge badge-stale">Layer 2: Relay</span>
            <span className="badge badge-offline">Layer 3: Drift</span>
            <span className="badge badge-verified">Layer 4: Patterns</span>
            <span className="badge badge-unknown">Layer 5: Community</span>
          </div>
        </div>
      </div>
    </div>
  </PublicShell>
}
