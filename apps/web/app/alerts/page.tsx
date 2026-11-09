
'use client'
import AppShell from '@/components/AppShell'
import { useState } from 'react'
export default function Page(){
  const [filter,setFilter]=useState('all')
  const alerts=[
    {id:'1',type:'supply.lost',severity:'critical',message:'Supply interruption detected at 2026-11-09 02:14 Lagos. Last reading 02:12.',time:'2h ago',status:'open'},
    {id:'2',type:'voltage.unsafe',severity:'warning',message:'Voltage 262V outside 180–250V range. Power cut confirmed.',time:'5h ago',status:'acknowledged'},
    {id:'3',type:'tamper.suspected',severity:'warning',message:'Measurement mismatch needs review. Not confirmed theft.',time:'1d ago',status:'open'},
    {id:'4',type:'balance.zero',severity:'info',message:'Balance exhausted. Cutoff pending confirmation.',time:'2d ago',status:'open'},
  ]
  const filtered= filter==='all' ? alerts : alerts.filter(a=>a.severity===filter)
  return <AppShell role="tenant">
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <h1 style={{color:'var(--navy)',margin:0}}>Alerts</h1>
      <div style={{display:'flex',gap:8}}>
        <select value={filter} onChange={e=>setFilter(e.target.value)} className="input" style={{width:130}}><option value="all">All</option><option value="critical">Critical</option><option value="warning">Warning</option><option value="info">Info</option></select>
        <a href="/support" className="btn btn-secondary">Support</a>
      </div>
    </div>
    <p style={{color:'var(--muted)'}}>Severity/type/status feed; timestamps/source; next step. Acknowledge ≠ resolution; offline ≠ tamper.</p>
    
    <div className="grid-12" style={{marginTop:16}}>
      {filtered.map(a=>(
        <div key={a.id} className="card" style={{gridColumn:'span 6',borderLeft: a.severity==='critical' ? '4px solid var(--red)' : a.severity==='warning' ? '4px solid var(--amber)' : '4px solid var(--muted)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span className={`badge ${a.severity==='critical'?'badge-offline':a.severity==='warning'?'badge-stale':'badge-verified'}`}>{a.severity}</span>
            <span style={{fontSize:12,color:'var(--muted)'}}>{a.time} · {a.status}</span>
          </div>
          <div style={{fontWeight:600,marginTop:8}}>{a.type}</div>
          <p style={{fontSize:13,color:'var(--muted)'}}>{a.message}</p>
          <div style={{display:'flex',gap:8,marginTop:12,flexWrap:'wrap'}}>
            <button className="btn btn-secondary" style={{padding:'6px 12px'}}>Acknowledge</button>
            <a href={`/devices/demo-id`} className="btn btn-secondary" style={{padding:'6px 12px'}}>Inspect</a>
            {a.type==='tamper.suspected' && <a href="/disputes" className="btn btn-secondary" style={{padding:'6px 12px'}}>Open dispute</a>}
            {a.type==='supply.lost' && <a href="/ops/incidents/demo-id" className="btn btn-secondary" style={{padding:'6px 12px'}}>Incident</a>}
          </div>
        </div>
      ))}
    </div>
    <div className="card" style={{marginTop:16}}>
      <h3>SMS / USSD / In-App</h3>
      <p style={{color:'var(--muted)',fontSize:13}}>All templates use measured/confirmed facts. Deduped by episode+recipient+template+channel. Provider callbacks verified, idempotent. Quiet hours 21:00–07:00 Lagos — critical bypasses.</p>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <button className="btn btn-secondary">Notification settings</button>
        <button className="btn btn-secondary">USSD: dial *123#</button>
      </div>
    </div>
  </AppShell>
}
