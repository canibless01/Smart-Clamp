'use client'
import AppShell from '@/components/AppShell'
import { useState } from 'react'
export default function Page(){
  const [plan,setPlan]=useState('basic')
  const [grace,setGrace]=useState(false)
  return <AppShell role="tenant">
    <h1 style={{color:'var(--navy)',margin:0}}>Subscription & Plan Management</h1>
    <p style={{color:'var(--muted)'}}>Free validation anonymous · Basic monitors · Basic Pro analytics · Pro eligible control. Subscription never cuts electricity — 7-day grace, then limited app features.</p>
    <div className="grid-12" style={{marginTop:16}}>
      <div className="card" style={{gridColumn:'span 4'}}>
        <div style={{fontWeight:700}}>Free</div><div style={{fontSize:13,color:'var(--muted)'}}>Anonymous validation, public view</div>
        <button onClick={()=>setPlan('free')} className={`btn ${plan==='free'?'btn-primary':'btn-secondary'}`} style={{marginTop:8,width:'100%'}}>Current</button>
      </div>
      <div className="card" style={{gridColumn:'span 4',border:'2px solid var(--navy)'}}>
        <div style={{fontWeight:700}}>Basic — current</div><div style={{fontSize:13,color:'var(--muted)'}}>Live usage, alerts, community, reports</div>
        <button onClick={()=>setPlan('basic_pro')} className="btn btn-amber" style={{marginTop:8,width:'100%'}}>Upgrade to Basic Pro</button>
      </div>
      <div className="card" style={{gridColumn:'span 4'}}>
        <div style={{fontWeight:700}}>Pro</div><div style={{fontSize:13,color:'var(--muted)'}}>Eligible relay + all analytics</div>
        <button onClick={()=>setPlan('pro')} className="btn btn-secondary" style={{marginTop:8,width:'100%'}}>Upgrade to Pro</button>
      </div>
      <div className="card" style={{gridColumn:'span 6'}}>
        <h3>Plan details</h3>
        <div style={{display:'grid',gap:8,marginTop:12}}>
          <div style={{display:'flex',justifyContent:'space-between'}}><span>Current plan</span><strong>{plan}</strong></div>
          <div style={{display:'flex',justifyContent:'space-between'}}><span>Renewal</span><span>2026-12-09</span></div>
          <div style={{display:'flex',justifyContent:'space-between'}}><span>Grace (if lapsed)</span><span>7 days</span></div>
        </div>
        <div style={{display:'flex',gap:8,marginTop:12}}>
          <button onClick={()=>setGrace(!grace)} className="btn btn-secondary">{grace?'Exit grace preview':'Preview grace'}</button>
          <button className="btn" style={{background:'var(--red)',color:'white'}}>Cancel renewal</button>
        </div>
        {grace && <div style={{marginTop:12,background:'#FFF4E5',padding:12,borderRadius:8}}>Grace mode — limited app features, electricity remains governed separately. This does not disconnect power.</div>}
        <div style={{fontSize:12,color:'var(--muted)',marginTop:8}}>House Full prepaid/safety derives from installed room service capability, not homeowner Pro entitlement. Safety never subscription-gated.</div>
      </div>
      <div className="card" style={{gridColumn:'span 6'}}>
        <h3>Downgrade</h3>
        <p style={{fontSize:13,color:'var(--muted)'}}>Before removing paid automation entitlement, cancel future delegated executions + notify; do not force relay state.</p>
        <button className="btn btn-secondary">Compare plans</button>
        <a href="/pricing" className="btn btn-secondary" style={{marginLeft:8}}>Pricing</a>
      </div>
    </div>
  </AppShell>
}
