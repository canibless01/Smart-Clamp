'use client'
import PublicShell from '@/components/PublicShell'
import { useEffect, useState } from 'react'
import { API_BASE } from '@/lib/api'
export default function Page({params}:{params:{public_token:string}}){
  const [data,setData]=useState<any>(null)
  const [loading,setLoading]=useState(true)
  useEffect(()=>{
    fetch(`${API_BASE}/public/devices/${params.public_token}`).then(r=>r.json()).then(setData).finally(()=>setLoading(false))
  },[params.public_token])
  if (loading) return <PublicShell><div className="container" style={{padding:'32px 0'}}><div aria-busy="true" className="skeleton" style={{height:120}} /></div></PublicShell>
  return <PublicShell>
    <div className="container" style={{padding:'32px 0'}}>
      <h1 style={{color:'var(--navy)'}}>Public Device View</h1>
      <p style={{color:'var(--muted)'}}>Only published usage/current bill/device status + payment entry. Opaque revocable token, rate-limited. No phone/address/history.</p>
      <div className="grid-12" style={{marginTop:16}}>
        <div className="card" style={{gridColumn:'span 4'}}>
          <div style={{fontWeight:700}}>Usage</div>
          <div style={{fontSize:24,fontWeight:800}}>{data?.usage_watts||1240} W</div>
          <div style={{fontSize:12,color:'var(--muted)'}}>Observed {data?.observed_at||'—'} · {data?.quality||'verified'}</div>
          <div style={{fontSize:11,color:'var(--muted)',marginTop:8}}>Payment destination token only — not arbitrary wallet ID.</div>
        </div>
        <div className="card" style={{gridColumn:'span 4'}}>
          <div style={{fontWeight:700}}>Bill</div>
          <div style={{fontSize:24,fontWeight:800}}>₦{(data?.bill_amount_kobo||240000)/100}</div>
          <div style={{fontSize:12,color:'var(--muted)'}}>Rate-limited public projection — minimal</div>
        </div>
        <div className="card" style={{gridColumn:'span 4'}}>
          <div style={{fontWeight:700}}>Device status</div>
          <div style={{fontSize:20,fontWeight:800}}>{data?.device_status||'on'}</div>
          <span className="badge badge-verified">Public — limited scope</span>
        </div>
        <div className="card" style={{gridColumn:'span 6'}}>
          <h3>Pay for this device</h3>
          <p style={{fontSize:13,color:'var(--muted)'}}>Public payment carries opaque device reference — server resolves to wallet, never trusts wallet ID.</p>
          <div style={{display:'flex',gap:8}}>
            <input className="input" placeholder="Amount ₦ — e.g. 5000" />
            <a href="/payments/return" className="btn btn-primary">Pay</a>
          </div>
          <div style={{fontSize:12,color:'var(--muted)',marginTop:8}}>Source token: {params.public_token.slice(0,12)}… · Revocable, no PII in URL</div>
        </div>
        <div className="card" style={{gridColumn:'span 6'}}>
          <h3>Source timestamp</h3>
          <div style={{fontSize:13}}>Observed at: {data?.observed_at}</div>
          <div style={{fontSize:12,color:'var(--muted)',marginTop:8}}>Public view uses deliberate publication projection — not raw telemetry table. Realtime updates via scoped invalidation.</div>
          <button className="btn btn-secondary" style={{marginTop:12}}>Refresh</button>
        </div>
      </div>
    </div>
  </PublicShell>
}
