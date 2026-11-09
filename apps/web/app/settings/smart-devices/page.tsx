'use client'
import AppShell from '@/components/AppShell'
import { useState } from 'react'
export default function Page(){
  const [devices,setDevices]=useState([
    {id:'1',name:'Living room Tuya bulb',status:'connected',type:'Tuya'},
    {id:'2',name:'Bedroom Matter switch',status:'disconnected',type:'Matter'},
  ])
  return <AppShell role="tenant">
    <h1 style={{color:'var(--navy)',margin:0}}>Linked Smart Devices</h1>
    <p style={{color:'var(--muted)'}}>Tuya OAuth credential private; Matter fabric gateway binding; last verified connection.</p>
    <div className="grid-12" style={{marginTop:16}}>
      {devices.map(d=>(
        <div key={d.id} className="card" style={{gridColumn:'span 6'}}>
          <div style={{display:'flex',justifyContent:'space-between'}}><strong>{d.name}</strong><span className={`badge ${d.status==='connected'?'badge-verified':'badge-offline'}`}>{d.status}</span></div>
          <div style={{fontSize:13,color:'var(--muted)'}}>{d.type} · Last verified: 2026-11-09 12:00</div>
          <div style={{display:'flex',gap:8,marginTop:12}}>
            <button className="btn btn-secondary" style={{padding:'6px 12px'}}>Verify</button>
            <button className="btn btn-secondary" style={{padding:'6px 12px'}}>Unlink</button>
          </div>
        </div>
      ))}
      <div className="card" style={{gridColumn:'span 12'}}>
        <h3>Link new device</h3>
        <p style={{fontSize:13,color:'var(--muted)'}}>Phase 2 — Tuya/Matter integrations behind explicit flags; unsupported explicit.</p>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:12}}>
          <button className="btn btn-primary">Link Tuya (OAuth)</button>
          <button className="btn btn-primary">Link Matter (fabric)</button>
          <button className="btn btn-secondary">Learn more</button>
        </div>
        <div style={{fontSize:11,color:'var(--muted)',marginTop:8}}>OAuth credentials stored private, never in browser localStorage beyond session. Meter/transport adapters typed — fake deterministic test adapter vs real provider separate.</div>
      </div>
    </div>
  </AppShell>
}
