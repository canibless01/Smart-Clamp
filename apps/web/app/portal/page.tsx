
'use client'
import AppShell from '@/components/AppShell'
import { useState } from 'react'
export default function Page(){
  const [tab,setTab]=useState<'jobs'|'referrals'|'payouts'>('jobs')
  return <AppShell role="installer">
    <h1 style={{color:'var(--navy)',margin:0}}>Portal</h1>
    <p style={{color:'var(--muted)'}}>Assigned jobs, diagnostic subset — scoped to actor. No tariff/ledger access.</p>
    <div style={{display:'flex',gap:8,marginTop:16,borderBottom:'1px solid var(--border)',paddingBottom:12}}>
      <button onClick={()=>setTab('jobs')} className={`btn ${tab==='jobs'?'btn-primary':'btn-secondary'}`}>Jobs</button>
      <button onClick={()=>setTab('referrals')} className={`btn ${tab==='referrals'?'btn-primary':'btn-secondary'}`}>Referrals</button>
      <button onClick={()=>setTab('payouts')} className={`btn ${tab==='payouts'?'btn-primary':'btn-secondary'}`}>Payouts</button>
    </div>

    {tab==='jobs' && <div style={{marginTop:16}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
        <h3 style={{margin:0}}>Installation Jobs</h3>
        <span className="badge badge-verified">3 assigned</span>
      </div>
      <div className="grid-12" style={{marginTop:12}}>
        {[
          {id:'JOB-001',building:'FUTA Lodge A',rooms:'6 rooms',status:'assigned',priority:'high',due:'2026-11-10'},
          {id:'JOB-002',building:'FUTA Lodge B',rooms:'4 rooms',status:'in_progress',priority:'normal',due:'2026-11-12'},
          {id:'JOB-003',building:'Ilara House',rooms:'Pole Gateway',status:'diagnostic_failed',priority:'high',due:'Overdue'},
        ].map(j=>(
          <div key={j.id} className="card" style={{gridColumn:'span 4'}}>
            <div style={{display:'flex',justifyContent:'space-between'}}><strong>{j.id}</strong><span className={`badge ${j.status==='diagnostic_failed'?'badge-offline':j.status==='in_progress'?'badge-stale':'badge-verified'}`}>{j.status}</span></div>
            <div style={{fontWeight:600,marginTop:8}}>{j.building}</div>
            <div style={{fontSize:13,color:'var(--muted)'}}>{j.rooms} · Due {j.due} · {j.priority}</div>
            <div style={{display:'flex',gap:8,marginTop:12,flexWrap:'wrap'}}>
              <a href="/install" className="btn btn-primary" style={{padding:'6px 12px'}}>Commission</a>
              <a href="/devices/demo-id" className="btn btn-secondary" style={{padding:'6px 12px'}}>Diagnostics</a>
            </div>
            <div style={{fontSize:11,color:'var(--muted)',marginTop:8}}>Failed test stays commissioning_failed with retry/RMA; no payout. One payout per accepted commissioning + online proof.</div>
          </div>
        ))}
      </div>
    </div>}

    {tab==='referrals' && <div style={{marginTop:16}}>
      <h3>Agent / Referrer — Leads & Attribution</h3>
      <div className="card" style={{marginTop:12}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div><strong>Referral link</strong><div style={{fontSize:13,color:'var(--muted)'}}>https://smartclamp.ng/r/agent-ada-123</div></div>
          <button className="btn btn-secondary">Copy</button>
        </div>
      </div>
      <div className="table-wrap" style={{marginTop:12}}>
        <table>
          <thead><tr><th>Lead</th><th>Status</th><th>Channel</th><th>Payout</th></tr></thead>
          <tbody>
            <tr><td>Lagos House</td><td><span className="badge badge-verified">converted</span></td><td>WhatsApp</td><td>₦2,000 pending</td></tr>
            <tr><td>FUTA Lodge C</td><td><span className="badge badge-stale">pending</span></td><td>Direct</td><td>—</td></tr>
          </tbody>
        </table>
      </div>
    </div>}

    {tab==='payouts' && <div style={{marginTop:16}}>
      <h3>Payout Ledger</h3>
      <div className="card">
        <div style={{display:'flex',justifyContent:'space-between'}}><span>Total earned</span><strong>₦12,500</strong></div>
        <div style={{display:'flex',justifyContent:'space-between'}}><span>Pending</span><span>₦2,000</span></div>
        <div style={{display:'flex',justifyContent:'space-between'}}><span>Disbursed</span><span>₦10,500</span></div>
        <div style={{fontSize:12,color:'var(--muted)',marginTop:8}}>Payouts never via arbitrary wallet edit — approved disbursement with evidence, auditable reversals.</div>
      </div>
    </div>}
  </AppShell>
}
