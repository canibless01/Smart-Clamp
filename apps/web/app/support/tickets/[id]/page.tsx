'use client'
import AppShell from '@/components/AppShell'
import { useState } from 'react'
export default function Page({params}:{params:{id:string}}){
  const [msgs,setMsgs]=useState([
    {from:'You',text:'My IR-Reader shows no data for 2 hours.',time:'2026-11-09 10:00',private:false},
    {from:'Support (Ops)',text:'Checked — gateway was offline 08:00–10:00, now recovered. Your data will backfill.',time:'2026-11-09 10:30',private:false},
  ])
  const [draft,setDraft]=useState('')
  return <AppShell role="tenant">
    <h1 style={{color:'var(--navy)',margin:0}}>Support Case {params.id.slice(0,8)}</h1>
    <p style={{color:'var(--muted)'}}>Own/assigned case · status SLA · append-only conversation · private attachments (signed URL 15 min)</p>
    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:12}}>
      <span className="badge badge-verified">open</span>
      <span className="badge badge-stale">Priority: normal</span>
      <span className="badge badge-unknown">SLA: 2 business days</span>
      <a href="/support" className="btn btn-secondary" style={{padding:'6px 12px'}}>All tickets</a>
    </div>
    <div className="card" style={{marginTop:16}}>
      <h3>Conversation</h3>
      <div style={{display:'grid',gap:12,marginTop:12}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{padding:12,background: m.from==='You' ? 'var(--canvas)' : '#E6F4EA',borderRadius:8}}>
            <div style={{display:'flex',justifyContent:'space-between'}}><strong>{m.from}</strong><span style={{fontSize:12,color:'var(--muted)'}}>{m.time}</span></div>
            <div style={{fontSize:13,marginTop:4}}>{m.text}</div>
          </div>
        ))}
      </div>
      <div style={{display:'flex',gap:8,marginTop:16}}>
        <input className="input" value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Reply — max 4000 chars" style={{flex:1}} />
        <button onClick={()=>{ if(draft.trim()) setMsgs([...msgs,{from:'You',text:draft,time:'now',private:false}]); setDraft('')}} className="btn btn-primary">Send</button>
      </div>
      <div style={{fontSize:12,color:'var(--muted)',marginTop:8}}>Attachments: signed URL expires 15 min; validate MIME/size + malware scan before evidence access. No resolution from notification delivery alone.</div>
    </div>
    <div className="card" style={{marginTop:12}}>
      <h3>Case details</h3>
      <div style={{fontSize:13,display:'grid',gap:4}}>
        <div>Category: device · Linked payment/command/incident: incident-001</div>
        <div>Status: open → triaged → waiting_customer → resolved · Append-only, not mutable</div>
        <div>Assignment: Ops B · Private attachments: 1 (clean)</div>
      </div>
      <div style={{display:'flex',gap:8,marginTop:12}}>
        <button className="btn btn-secondary">Escalate</button>
        <button className="btn btn-secondary">Mark resolved</button>
      </div>
    </div>
  </AppShell>
}
