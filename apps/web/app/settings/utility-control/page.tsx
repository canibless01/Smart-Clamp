'use client'
import AppShell from '@/components/AppShell'
import { useState } from 'react'
export default function Page(){
  const [consents,setConsents]=useState([
    {id:'1',utility:'BEDC',capability:'meter reading',status:'active',accepted:'2026-10-01'},
    {id:'2',utility:'BEDC',capability:'remote OFF for non-payment',status:'revoked',accepted:'2026-09-15'},
  ])
  return <AppShell role="tenant">
    <h1 style={{color:'var(--navy)',margin:0}}>Utility Control Consent</h1>
    <p style={{color:'var(--muted)'}}>Explicit revocable consent per device-owner + named utility + capability. Revocation effective immediately; queued commands invalidated by policy epoch.</p>
    <div className="card" style={{marginTop:16}}>
      <h3>Your Consents</h3>
      <div className="table-wrap" style={{marginTop:12}}>
        <table>
          <thead><tr><th>Utility</th><th>Capability</th><th>Status</th><th>Accepted</th><th>Action</th></tr></thead>
          <tbody>
            {consents.map(c=>(
              <tr key={c.id}>
                <td>{c.utility}</td>
                <td>{c.capability}</td>
                <td><span className={`badge ${c.status==='active'?'badge-verified':'badge-offline'}`}>{c.status}</span></td>
                <td>{c.accepted}</td>
                <td>
                  {c.status==='active' ? <button onClick={()=>setConsents(cs=>cs.map(x=>x.id===c.id?{...x,status:'revoked'}:x))} className="btn btn-secondary" style={{padding:'6px 12px'}}>Revoke</button> : <button onClick={()=>setConsents(cs=>cs.map(x=>x.id===c.id?{...x,status:'active'}:x))} className="btn btn-primary" style={{padding:'6px 12px'}}>Grant</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{fontSize:12,color:'var(--muted)',marginTop:8}}>Admin creates region-scoped accounts; no self-serve utility role. Broadcast never silently becomes consent.</div>
      <div style={{display:'flex',gap:8,marginTop:16}}>
        <a href="/dashboard/utility" className="btn btn-secondary">Utility dashboard</a>
        <button className="btn btn-primary">Grant new consent</button>
      </div>
    </div>
    <div className="card" style={{marginTop:16}}>
      <h3>What you're consenting to</h3>
      <ul>
        <li><strong>Reading aggregates:</strong> Utility sees contracted region totals + approved drilldown (logged).</li>
        <li><strong>Bill generation:</strong> NEPA can generate bills from SmartClamp verified usage (marks generated_by_nepa).</li>
        <li><strong>Remote control:</strong> Requires this consent + staff authority + step-up. Re-checked at dispatch. Revocation kills in-flight queue.</li>
      </ul>
      <div style={{fontSize:12,color:'var(--red)'}}>No remote OFF without consent — hard-blocked 403 + customer confirmation.</div>
    </div>
  </AppShell>
}
