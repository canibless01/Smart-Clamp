
'use client'
import AppShell from '@/components/AppShell'
import { useState } from 'react'
export default function Page(){
  const [showNew,setShowNew]=useState(false)
  return <AppShell role="tenant">
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <h1 style={{color:'var(--navy)',margin:0}}>Dispute Center</h1>
      <button onClick={()=>setShowNew(true)} className="btn btn-primary">+ New dispute</button>
    </div>
    <p style={{color:'var(--muted)'}}>Reading/bill disputes only — no power action. Immutable evidence snapshot + audit.</p>
    
    <div className="grid-12" style={{marginTop:16}}>
      {[
        {id:'D-001',bill:'BILL-2026-10',period:'2026-10-01 → 2026-10-31',status:'open',note:'Usage mismatch — building vs room 3',replies:2},
        {id:'D-002',bill:'BILL-2026-09',period:'2026-09-01 → 2026-09-30',status:'resolved',note:'Overcharge — tariff split incorrect',replies:4},
      ].map(d=>(
        <div key={d.id} className="card" style={{gridColumn:'span 6'}}>
          <div style={{display:'flex',justifyContent:'space-between'}}><strong>{d.id} · {d.bill}</strong><span className={`badge ${d.status==='resolved'?'badge-verified':'badge-stale'}`}>{d.status}</span></div>
          <div style={{fontSize:13,color:'var(--muted)',marginTop:4}}>{d.period}</div>
          <p style={{fontSize:13}}>{d.note}</p>
          <div style={{fontSize:12,color:'var(--muted)'}}>Evidence hash: a3f9…c1d2 · {d.replies} replies</div>
          <div style={{display:'flex',gap:8,marginTop:12,flexWrap:'wrap'}}>
            <a href={`/disputes/${d.id}/meeting`} className="btn btn-primary" style={{padding:'6px 12px'}}>Meeting mode</a>
            <a href={`/support/tickets/demo-id`} className="btn btn-secondary" style={{padding:'6px 12px'}}>Thread</a>
            <button className="btn btn-secondary" style={{padding:'6px 12px'}}>Download evidence</button>
          </div>
          <div style={{fontSize:11,color:'var(--muted)',marginTop:8}}>Bill dispute freezes evidence snapshot, not household power. Reversals via ledger, never edit raw events.</div>
        </div>
      ))}
    </div>

    {showNew && <div role="dialog" aria-modal="true" style={{position:'fixed',inset:0,background:'rgba(16,42,67,.6)',display:'grid',placeItems:'center',padding:16}}>
      <div className="card" style={{maxWidth:520,width:'100%'}}>
        <h3>New Dispute</h3>
        <p style={{color:'var(--muted)',fontSize:13}}>Attach immutable period readings, coverage, tariff + ledger versions. Respondent can explain/propose/escalate. Accepted adjustment posts reversing entries.</p>
        <div style={{display:'grid',gap:12,marginTop:12}}>
          <select className="input"><option>Select bill — BILL-2026-10</option><option>BILL-2026-09</option></select>
          <input className="input" placeholder="Period start — 2026-10-01" />
          <input className="input" placeholder="Period end — 2026-10-31" />
          <textarea className="input" placeholder="Explain dispute — max 4000 chars" rows={3} />
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>setShowNew(false)} className="btn btn-primary">Create dispute</button>
            <button onClick={()=>setShowNew(false)} className="btn btn-secondary">Cancel</button>
          </div>
        </div>
      </div>
    </div>}

    <div className="card" style={{marginTop:16}}>
      <h3>Meeting Mode</h3>
      <p style={{color:'var(--muted)',fontSize:13}}>Stripped-down data-minimized view for in-person resolution — same scoped snapshot, excludes unrelated personal data.</p>
      <a href="/disputes/demo-id/meeting" className="btn btn-secondary">Open meeting mode</a>
    </div>
  </AppShell>
}
