'use client'
import AppShell from '@/components/AppShell'
import { useState } from 'react'
export default function Page({params}:{params:{id:string}}){
  const [rooms,setRooms]=useState([
    {id:'r1',label:'Room 1',tenant:'+2348012345678',status:'occupied'},
    {id:'r2',label:'Room 2',tenant:null,status:'vacant'},
    {id:'r3',label:'Room 3',tenant:'+2348098765432',status:'occupied'},
  ])
  return <AppShell role="landlord">
    <h1 style={{color:'var(--navy)',margin:0}}>Building {params.id.slice(0,8)} — Rooms</h1>
    <p style={{color:'var(--muted)'}}>Building name/address/meter type; rooms; tenant invites; transfer process preserves history.</p>
    <div style={{display:'flex',gap:8,marginTop:12,flexWrap:'wrap'}}>
      <input className="input" placeholder="New room label — e.g. Room 4" style={{maxWidth:240}} />
      <button onClick={()=>setRooms([...rooms,{id:`r${rooms.length+1}`,label:`Room ${rooms.length+1}`,tenant:null,status:'vacant'}])} className="btn btn-primary">Add room</button>
      <button className="btn btn-secondary">Create invite link</button>
    </div>
    <div className="grid-12" style={{marginTop:16}}>
      {rooms.map(r=>(
        <div key={r.id} className="card" style={{gridColumn:'span 4'}}>
          <div style={{display:'flex',justifyContent:'space-between'}}><strong>{r.label}</strong><span className={`badge ${r.status==='occupied'?'badge-verified':'badge-unknown'}`}>{r.status}</span></div>
          <div style={{fontSize:13,color:'var(--muted)',marginTop:8}}>{r.tenant ? `Tenant: ${r.tenant.slice(0,8)}…` : 'No tenant — invite pending'}</div>
          <div style={{display:'flex',gap:8,marginTop:12,flexWrap:'wrap'}}>
            <button className="btn btn-secondary" style={{padding:'6px 12px'}}>Invite</button>
            <button className="btn btn-secondary" style={{padding:'6px 12px'}}>Transfer</button>
            <a href="/devices/demo-id" className="btn btn-secondary" style={{padding:'6px 12px'}}>Device</a>
          </div>
          <div style={{fontSize:11,color:'var(--muted)',marginTop:8}}>Transfer: close old occupancy (revoke viewer/token), open new — history preserved, not overwritten.</div>
        </div>
      ))}
    </div>
    <div className="card" style={{marginTop:16}}>
      <h3>Transfer Flow</h3>
      <p style={{color:'var(--muted)',fontSize:13}}>Landlord vacates room ahead of new tenant: POST /rooms/{`{room_id}`}/transfer → revokes grants → new invite. Immutable intervals, no overlapping active occupancy.</p>
      <div style={{display:'flex',gap:8}}>
        <a href="/dashboard/landlord" className="btn btn-secondary">Back to portfolio</a>
        <a href="/billing" className="btn btn-secondary">Building accounting</a>
      </div>
    </div>
  </AppShell>
}
