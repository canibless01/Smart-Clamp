import PublicShell from '@/components/PublicShell'
import MeterLookup from '@/components/MeterLookup'
import UsageChart from '@/components/UsageChart'

export default function HomePage() {
  return (
    <PublicShell>
      {/* Hero */}
      <section className="hero" style={{background:'linear-gradient(180deg,#102A43 0%,#1A4A7A 100%)',color:'white',paddingBottom:48}}>
        <div className="container">
          <div className="grid-12" style={{alignItems:'center'}}>
            <div style={{gridColumn:'span 7'}}>
              <h1 style={{color:'white'}}>Electricity you can verify — with or without a meter.</h1>
              <p style={{color:'#CBD5E1'}}>See what you use. Understand what you pay. Control power where your device supports it.</p>
              <div style={{display:'flex',gap:12,marginTop:20,flexWrap:'wrap'}}>
                <a href="#meter" className="btn btn-amber">Check your meter</a>
                <a href="/signup" className="btn" style={{background:'white',color:'#102A43'}}>Get started</a>
              </div>
            </div>
            <div style={{gridColumn:'span 5'}}>
              <div style={{background:'rgba(255,255,255,.1)',backdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,.2)',borderRadius:16,padding:16}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontWeight:700}}>How it works</span>
                  <span style={{fontSize:12,opacity:.8}}>Interactive demo — simulated data</span>
                </div>
                <div style={{marginTop:12,display:'grid',gap:8}}>
                  {['Fair room allocation','Evidence for estimated bills','Usage visibility','Optional power control'].map((t,i)=>
                    <div key={t} style={{padding:'10px 12px',background:i===0?'white':'rgba(255,255,255,.12)',color:i===0?'#102A43':'white',borderRadius:10,fontWeight:600}}>{i+1}. {t}</div>
                  )}
                </div>
                <div style={{display:'flex',gap:8,marginTop:12}}>
                  <button className="btn btn-secondary" style={{padding:'8px 12px'}}>Pause</button>
                  <button className="btn btn-secondary" style={{padding:'8px 12px'}}>‹ Prev</button>
                  <button className="btn btn-secondary" style={{padding:'8px 12px'}}>Next ›</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Meter lookup */}
      <section id="meter" className="container" style={{marginTop:32}}>
        <h2 style={{color:'var(--navy)',fontSize:28}}>Validate your meter</h2>
        <p style={{color:'var(--muted)',maxWidth:720}}>Enter your meter number to confirm the account. No payment needed. Live balance and history require a supported connection.</p>
        <div style={{marginTop:16}}>
          <MeterLookup />
        </div>
      </section>

      {/* Demo */}
      <section className="container" style={{marginTop:48}}>
        <div className="grid-12">
          <div style={{gridColumn:'span 8'}}>
            <UsageChart />
          </div>
          <div style={{gridColumn:'span 4'}}>
            <div className="card">
              <div style={{fontWeight:700}}>Live demo</div>
              <div style={{marginTop:12,display:'grid',gap:12}}>
                <div style={{display:'flex',justifyContent:'space-between'}}><span>Power</span><strong>1.24 kW</strong></div>
                <div style={{display:'flex',justifyContent:'space-between'}}><span>Balance</span><strong>₦2,400 · 18.2 kWh</strong></div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><span>Relay</span><span className="badge badge-verified">ON — confirmed</span></div>
                <button className="btn btn-primary">Toggle (simulated)</button>
              </div>
              <p style={{fontSize:12,color:'var(--muted)',marginTop:12}}>Demo ticks are labeled simulated. Reduce-motion shows discrete updates. Real control requires commissioning and step-up verification.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Four steps */}
      <section className="container" style={{marginTop:48}}>
        <h2 style={{textAlign:'center',color:'var(--navy)'}}>Measure → Connect → Verify → Manage</h2>
        <div className="grid-12" style={{marginTop:20}}>
          {[
            {t:'Measure',d:'Calibrated CT + voltage sampling, true watts via mean(v·i), power factor and import/export counters.'},
            {t:'Connect',d:'Pole devices via ESP-NOW to Gateway; House Full via RS485 to Building Hub. Each uplinks independently.'},
            {t:'Verify',d:'Matched 5-min intervals, 95% coverage, 5/8/10% thresholds, 3 consecutive windows for suspected-mismatch.'},
            {t:'Manage',d:'Receipts, schedules, budgets, and reports. Recharge clears only its own zero-balance restriction.'},
          ].map(s=>(
            <div key={s.t} style={{gridColumn:'span 3'}} className="card">
              <div style={{width:48,height:48,borderRadius:12,background:'var(--canvas)',border:'1px solid var(--border)',display:'grid',placeItems:'center',fontWeight:800,color:'var(--navy)'}}>{s.t[0]}</div>
              <div style={{fontWeight:700,marginTop:12}}>{s.t}</div>
              <p style={{color:'var(--muted)',fontSize:14}}>{s.d}</p>
              <a href="/how-it-works" style={{fontWeight:600}}>Learn more →</a>
            </div>
          ))}
        </div>
      </section>

      {/* Audience cards */}
      <section className="container" style={{marginTop:48}}>
        <div className="grid-12">
          {[
            {title:'Shared Housing',desc:'Fair per-room allocation, landlord building view, transfer with preserved history.',href:'/for-landlords'},
            {title:'Single Home',desc:'Pole measurement, Pro analytics and optional relay — one device, not a redundant pair.',href:'/for-homeowners'},
            {title:'Already Smart?',desc:'Link your supported meter via IR-Reader or manual evidence with provenance.',href:'/smart-meter'},
          ].map(c=>(
            <a key={c.title} href={c.href} className="card" style={{gridColumn:'span 4',display:'block'}}>
              <div style={{fontWeight:700,color:'var(--navy)'}}>{c.title}</div>
              <p style={{color:'var(--muted)'}}>{c.desc}</p>
              <span style={{fontWeight:600}}>Explore →</span>
            </a>
          ))}
        </div>
      </section>

      {/* Trust strip */}
      <section style={{background:'var(--surface)',borderTop:'1px solid var(--border)',borderBottom:'1px solid var(--border)',marginTop:48,padding:'24px 0'}}>
        <div className="container" style={{display:'flex',gap:16,flexWrap:'wrap',justifyContent:'space-between'}}>
          {['Metered or unmetered options','Offline buffering by design','Evidence with clear provenance','Optional relay control'].map(t=>(
            <div key={t} style={{display:'flex',alignItems:'center',gap:8,fontWeight:600}}><span style={{width:8,height:8,background:'var(--green)',borderRadius:999}} />{t}</div>
          ))}
        </div>
      </section>

      {/* Pilot proof */}
      <section className="container" style={{marginTop:32}}>
        <div className="card" style={{display:'flex',gap:16,alignItems:'center',flexWrap:'wrap',justifyContent:'space-between'}}>
          <div>
            <div style={{fontWeight:800,color:'var(--navy)'}}>Piloting in the FUTA area — verified results coming soon.</div>
            <div style={{color:'var(--muted)',fontSize:14}}>No invented testimonials. Real pilot outcomes require period, sample size, source and permission.</div>
          </div>
          <a href="/about" className="btn btn-secondary">About the pilot</a>
        </div>
      </section>

      {/* Pricing preview */}
      <section className="container" style={{marginTop:48}}>
        <h2 style={{textAlign:'center',color:'var(--navy)'}}>Pricing</h2>
        <p style={{textAlign:'center',color:'var(--muted)'}}>Recurring platform subscription is separate from electricity credit, hardware and install cost. Free validation ₦0.</p>
        <div className="grid-12" style={{marginTop:20}}>
          {[
            {name:'Free',price:'₦0',feat:['Anonymous meter validation','Public device view']},
            {name:'Basic',price:'Pricing being finalized',feat:['Live usage & history','Alerts & community']},
            {name:'Basic Pro',price:'Pricing being finalized',feat:['Bill forecast & load signatures','Power factor, peer benchmarks, reports']},
            {name:'Pro',price:'Pricing being finalized',feat:['Eligible relay control','Schedules & budgets']},
          ].map(p=>(
            <div key={p.name} className="card" style={{gridColumn:'span 3'}}>
              <div style={{fontWeight:800,color:'var(--navy)'}}>{p.name}</div>
              <div style={{fontWeight:700,margin:'8px 0'}}>{p.price}</div>
              <ul style={{paddingLeft:18,color:'var(--muted)'}}>{p.feat.map(f=><li key={f}>{f}</li>)}</ul>
              <a href="/pricing" className="btn btn-primary" style={{marginTop:12,width:'100%'}}>Compare plans</a>
            </div>
          ))}
        </div>
        <div style={{textAlign:'center',marginTop:16}}><a href="/pricing" className="btn btn-secondary">See full pricing</a> <span style={{margin:'0 8px',color:'var(--muted)'}}>·</span> Shared housing? <a href="/for-landlords" style={{fontWeight:700}}>Talk to us →</a></div>
      </section>

      {/* Final CTA */}
      <section className="container" style={{marginTop:48}}>
        <div style={{background:'var(--navy)',color:'white',borderRadius:16,padding:32,display:'flex',gap:16,justifyContent:'space-between',alignItems:'center',flexWrap:'wrap'}}>
          <div>
            <div style={{fontSize:24,fontWeight:800}}>Know your usage. Keep your evidence.</div>
            <div style={{color:'#CBD5E1'}}>Get started or check your meter in seconds.</div>
          </div>
          <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
            <a href="/signup" className="btn btn-amber">Get started</a>
            <a href="#meter" className="btn" style={{background:'transparent',color:'white',border:'1px solid rgba(255,255,255,.4)'}}>Check your meter</a>
          </div>
        </div>
      </section>
    </PublicShell>
  )
}
