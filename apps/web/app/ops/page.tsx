
'use client'
import AppShell from '@/components/AppShell'
import { useState } from 'react'
export default function Page(){
  const [panel,setPanel]=useState('A')
  const panels=[
    {k:'A',l:'Fleet'}, {k:'B',l:'Alerts'}, {k:'C',l:'Adoption'}, {k:'D',l:'Finance'}, {k:'E',l:'Disputes'}, {k:'F',l:'Errors'}, {k:'G',l:'Compliance'}, {k:'H',l:'Field Ops'}, {k:'I',l:'Inventory'}, {k:'J',l:'Flags'}, {k:'K',l:'Audit'}, {k:'L',l:'Geographic'}, {k:'M',l:'Vendors'},
  ]
  return <AppShell role="internal_ops">
    <h1 style={{color:'var(--navy)',margin:0}}>Ops — Panels A–M</h1>
    <p style={{color:'var(--muted)'}}>Master 12.6 mapping. Each panel is isolated — failed finance provider doesn't hide fleet status.</p>
    <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:12}}>
      {panels.map(p=><button key={p.k} onClick={()=>setPanel(p.k)} className={`btn ${panel===p.k?'btn-primary':'btn-secondary'}`} style={{padding:'6px 10px',fontSize:12}}>{p.k} {p.l}</button>)}
    </div>
    <div className="grid-12" style={{marginTop:16}}>
      <div className="card" style={{gridColumn:'span 8'}}>
        <h3>Panel {panel} — {panels.find(x=>x.k===panel)?.l}</h3>
        {panel==='A' && <div>
          <p style={{color:'var(--muted)'}}>Fleet health with map, firmware distribution, provenance. Shows supply_state independent of connectivity.</p>
          <div style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:12}}>
            <div style={{padding:12,background:'var(--canvas)',borderRadius:8,minWidth:140}}><div style={{fontWeight:700,fontSize:20}}>47</div><div style={{fontSize:12}}>Online</div></div>
            <div style={{padding:12,background:'var(--canvas)',borderRadius:8,minWidth:140}}><div style={{fontWeight:700,fontSize:20}}>3</div><div style={{fontSize:12}}>Stale (180s)</div></div>
            <div style={{padding:12,background:'var(--canvas)',borderRadius:8,minWidth:140}}><div style={{fontWeight:700,fontSize:20}}>1</div><div style={{fontSize:12}}>Supply lost</div></div>
          </div>
          <div style={{fontSize:12,color:'var(--muted)',marginTop:12}}>Firmware: v2.1.0 (82%) · v2.0.3 (18%). <a href="/ops/incidents/demo-id" style={{fontWeight:600}}>View incident →</a></div>
        </div>}
        {panel==='B' && <div><p style={{color:'var(--muted)'}}>Company-wide alerts, false-positive rate, data completeness. No auto public naming.</p><div style={{marginTop:12,padding:12,background:'var(--canvas)',borderRadius:8}}><div style={{fontWeight:600}}>Alert volume: 12 this week · False-positive: 8% · Completeness: 94%</div></div></div>}
        {panel==='C' && <div><p style={{color:'var(--muted)'}}>Adoption, tiers, churn, funnel, channel attribution.</p><div style={{marginTop:12}}>Free: 120 · Basic: 45 · Basic Pro: 12 · Pro: 8 · Churn: 2%</div></div>}
        {panel==='D' && <div><p style={{color:'var(--muted)'}}>Revenue by stream, reconciliation, wallet liability, CAC, runway — from finance inputs, not wallet liabilities.</p><div style={{fontWeight:700}}>MRR ₦180,000 · Wallet liability ₦1.2M · Runway 14 months</div></div>}
        {panel==='J' && <div><p style={{color:'var(--muted)'}}>Feature flags — list + toggle with audit.</p><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:8,border:'1px solid var(--border)',borderRadius:8,marginTop:8}}><span>pro_relay_control</span><span className="badge badge-verified">enabled</span></div></div>}
        {panel!=='A' && panel!=='B' && panel!=='C' && panel!=='D' && panel!=='J' && <div><p style={{color:'var(--muted)'}}>Panel {panel} details — scoped to authorized staff, audited access. All data versioned and exportable.</p><div className="skeleton" style={{height:80,marginTop:12}} /></div>}
        <div style={{display:'flex',gap:8,marginTop:16}}>
          <a href="/ops/incidents/demo-id" className="btn btn-secondary">Incident detail</a>
          <a href="/devices/demo-id" className="btn btn-secondary">Device provenance</a>
        </div>
      </div>
      <div className="card" style={{gridColumn:'span 4'}}>
        <h4>Quick Actions</h4>
        <div style={{display:'grid',gap:8,marginTop:8}}>
          <button className="btn btn-secondary">Dispatch field team</button>
          <button className="btn btn-secondary">Generate compliance report</button>
          <button className="btn btn-secondary">View error logs</button>
          <button className="btn btn-secondary">Audit trail</button>
        </div>
        <div style={{fontSize:11,color:'var(--muted)',marginTop:12}}>All ops actions audited; finance runway from explicit inputs, never inferred from wallet balances.</div>
      </div>
    </div>
  </AppShell>
}
