'use client'
import AppShell from '@/components/AppShell'
import { useState } from 'react'
export default function Page(){
  const [orders,setOrders]=useState([
    {id:'ORD-001',profile:'house_full',address:'FUTA Lodge A, Room 3',status:'assigned',contact:'+2348012345678'},
    {id:'ORD-002',profile:'ir_reader',address:'Ilara House',status:'provisioning',contact:'+2348098765432'},
  ])
  return <AppShell role="tenant">
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <h1 style={{color:'var(--navy)',margin:0}}>Orders & Install Booking</h1>
      <button onClick={()=>setOrders(o=>[...o,{id:`ORD-00${o.length+1}`,profile:'pole_gateway',address:'New address',status:'waiting_hardware',contact:'+2348...'}])} className="btn btn-primary">+ New order</button>
    </div>
    <p style={{color:'var(--muted)'}}>Request hardware/install — pending quote + coverage. Statuses: waiting_hardware → assigned → provisioning → diagnostic_failed → awaiting_online → commissioned</p>
    <div className="grid-12" style={{marginTop:16}}>
      {orders.map(o=>(
        <div key={o.id} className="card" style={{gridColumn:'span 6'}}>
          <div style={{display:'flex',justifyContent:'space-between'}}><strong>{o.id}</strong><span className={`badge ${o.status==='commissioned'?'badge-verified':o.status==='diagnostic_failed'?'badge-offline':'badge-stale'}`}>{o.status}</span></div>
          <div style={{fontWeight:600,marginTop:8}}>{o.profile} · {o.address}</div>
          <div style={{fontSize:13,color:'var(--muted)'}}>{o.contact}</div>
          <div style={{display:'flex',gap:8,marginTop:12,flexWrap:'wrap'}}>
            <button className="btn btn-primary" style={{padding:'6px 12px'}}>Confirm quote</button>
            <button className="btn btn-secondary" style={{padding:'6px 12px'}}>Reschedule</button>
            <button className="btn btn-secondary" style={{padding:'6px 12px'}}>Cancel</button>
            <a href="/install" className="btn btn-secondary" style={{padding:'6px 12px'}}>Install</a>
          </div>
          <div style={{fontSize:11,color:'var(--muted)',marginTop:8}}>Quote + coverage check required before commission. No "complete" after merely saving device ID.</div>
        </div>
      ))}
    </div>
    <div className="card" style={{marginTop:16}}>
      <h3>Create Order</h3>
      <div style={{display:'grid',gap:12,marginTop:12}}>
        <select className="input"><option>pole_gateway</option><option>pole_device</option><option>house_full</option><option>building_hub</option><option>ir_reader</option></select>
        <input className="input" placeholder="Service address" />
        <input className="input" placeholder="Contact phone +234..." />
        <textarea className="input" placeholder="Notes — max 2000 chars" rows={2} />
        <button className="btn btn-primary">Request order — pending quote</button>
      </div>
    </div>
  </AppShell>
}
