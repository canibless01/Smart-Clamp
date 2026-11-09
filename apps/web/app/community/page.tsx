
'use client'
import AppShell from '@/components/AppShell'
export default function Page(){
  return <AppShell role="tenant">
    <h1 style={{color:'var(--navy)',margin:0}}>Community</h1>
    <p style={{color:'var(--muted)'}}>Privacy-filtered building aggregates; reviewed risk notices — no named accusation from heuristics.</p>
    
    <div className="grid-12" style={{marginTop:16}}>
      <div className="card" style={{gridColumn:'span 8'}}>
        <h3>Building Aggregates (Anonymized)</h3>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:12}}>
          <div style={{flex:1,minWidth:120,padding:12,background:'var(--canvas)',borderRadius:8,textAlign:'center'}}><div style={{fontWeight:800,fontSize:20}}>142</div><div style={{fontSize:12}}>kWh this month (building)</div></div>
          <div style={{flex:1,minWidth:120,padding:12,background:'var(--canvas)',borderRadius:8,textAlign:'center'}}><div style={{fontWeight:800,fontSize:20}}>18.2</div><div style={{fontSize:12}}>kWh avg / room</div></div>
          <div style={{flex:1,minWidth:120,padding:12,background:'var(--canvas)',borderRadius:8,textAlign:'center'}}><div style={{fontWeight:800,fontSize:20}}>5+</div><div style={{fontSize:12}}>Rooms in cohort</div></div>
        </div>
        <div style={{fontSize:12,color:'var(--muted)',marginTop:8}}>Minimum cohort 5 — smaller samples suppressed (DOMAIN-RULES). No individual data without authorized purpose.</div>
        <div style={{marginTop:16}}>
          <h4>Reviewed Notices</h4>
          <div style={{padding:12,background:'#F7F9FC',borderRadius:8,border:'1px solid var(--border)'}}>
            <div style={{fontWeight:600}}>Measurement mismatch — needs review</div>
            <div style={{fontSize:13,color:'var(--muted)'}}>Not confirmed theft. Ops review, can dispatch/recalibrate, mark false positive. Only privacy-safe notices reach community.</div>
            <div style={{fontSize:12,color:'var(--muted)',marginTop:8}}>Period: 2026-11-01→07 · Confidence: medium · <a href="/alerts" style={{fontWeight:600}}>View alert</a></div>
          </div>
        </div>
      </div>
      <div className="card" style={{gridColumn:'span 4'}}>
        <h3>Report Suspicious Activity</h3>
        <p style={{fontSize:13,color:'var(--muted)'}}>Physical/magnetic symptoms, relay/current mismatch, upstream drift, pattern anomalies — all evidence signals, not proof.</p>
        <button className="btn btn-secondary" style={{width:'100%'}}>Submit report</button>
        <div style={{fontSize:11,color:'var(--muted)',marginTop:8}}>No public naming or supply cutoff — investigation + privacy review first.</div>
        <h4 style={{marginTop:16}}>Community Guidelines</h4>
        <ul style={{fontSize:13,paddingLeft:18}}>
          <li>Discuss aggregates, not individuals</li>
          <li>Verified evidence only</li>
          <li>Respect privacy — no doxxing</li>
        </ul>
      </div>
    </div>
  </AppShell>
}
