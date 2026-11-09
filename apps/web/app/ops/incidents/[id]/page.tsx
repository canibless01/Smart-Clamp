'use client'
import AppShell from '@/components/AppShell'
import { useState } from 'react'
export default function Page({params}:{params:{id:string}}){
  const [status,setStatus]=useState('open')
  return <AppShell role="internal_ops">
    <h1 style={{color:'var(--navy)',margin:0}}>Incident {params.id.slice(0,8)} — Outage Detail</h1>
    <p style={{color:'var(--muted)'}}>Scoped source/outage episode detail — assign/review/resolve, no relay side effect.</p>
    <div className="grid-12" style={{marginTop:16}}>
      <div className="card" style={{gridColumn:'span 8'}}>
        <div style={{display:'flex',justifyContent:'space-between'}}><strong>Transformer FUTA-1 — supply lost</strong><span className={`badge ${status==='resolved'?'badge-verified':'badge-offline'}`}>{status}</span></div>
        <div style={{fontSize:13,color:'var(--muted)',marginTop:8}}>Cause: voltage &lt;50V for 3s (debounced) · Started: 2026-11-09 02:14 Lagos · Confidence: high · Topology: 3 poles downstream</div>
        <div style={{marginTop:12,background:'var(--canvas)',padding:12,borderRadius:8}}>
          <div style={{fontWeight:600}}>Timeline</div>
          <div style={{fontSize:13,marginTop:8}}>02:14:00 — supply_lost recorded (voltage 0V)<br/>02:14:03 — episode opened, downstream dependents marked unknown<br/>02:18:12 — restored (voltage 228V stable 5 min gate)<br/>02:23:12 — auto-restore skipped (other OFF reason)</div>
        </div>
        <div style={{display:'flex',gap:8,marginTop:12,flexWrap:'wrap'}}>
          <button onClick={()=>setStatus('assigned')} className="btn btn-secondary">Assign dispatch</button>
          <button onClick={()=>setStatus('reviewed')} className="btn btn-secondary">Mark reviewed</button>
          <button onClick={()=>setStatus('resolved')} className="btn btn-primary">Resolve</button>
          <button onClick={()=>setStatus('reopened')} className="btn btn-secondary">Reopen</button>
        </div>
        <div style={{fontSize:12,color:'var(--muted)',marginTop:8}}>Action enum: assign_dispatch, mark_reviewed, resolve, reopen — reason/note required; no actuator command. Episode deduped, not per-reading SMS.</div>
      </div>
      <div className="card" style={{gridColumn:'span 4'}}>
        <h3>Affected</h3>
        <div style={{fontSize:13}}>Buildings: 3 · Rooms: 12 · Customers: 12<br/>Downstream offline propagated, not sensor failure.</div>
        <a href="/dashboard/utility" className="btn btn-secondary" style={{marginTop:12}}>Utility view</a>
        <h4 style={{marginTop:16}}>Notified</h4>
        <div style={{fontSize:13,color:'var(--muted)'}}>Episode subscribers: 8 (deduped) · Ops: 2 · Utility aggregate: 1<br/>Planned disconnection/relay state distinct from supply state.</div>
      </div>
    </div>
  </AppShell>
}
