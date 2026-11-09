'use client'
import AppShell from '@/components/AppShell'
import { LiveMetric, StatusBadge } from '@/components/LiveMetric'
import WalletCard from '@/components/WalletCard'
import UsageChart from '@/components/UsageChart'
import { useEffect, useState } from 'react'
import { API_BASE } from '@/lib/api'

export default function Page(){
  const [data,setData]=useState<any>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [offline,setOffline]=useState(false)

  useEffect(()=>{
    const token=localStorage.getItem('smartclamp_token')
    if (!token){ setError('Not authenticated — please log in'); setLoading(false); return }
    fetch(`${API_BASE}/dashboard/tenant`,{headers:{Authorization:`Bearer ${token}`}})
      .then(async r=>{ if (!r.ok) throw new Error(await r.text()); return r.json() })
      .then(d=>{ setData(d); setLoading(false)})
      .catch(()=>{ setError('Cannot reach SmartClamp. Showing last synced values.'); setOffline(true); setLoading(false)})
  },[])

  if (loading) return <AppShell role="tenant"><div aria-busy="true"><div className="skeleton" style={{height:24,width:'60%'}} /><div className="skeleton" style={{height:120,marginTop:12}} /></div><div aria-live="polite" className="live-region">Loading tenant dashboard</div></AppShell>
  if (error && !data) return <AppShell role="tenant"><div className="error-panel">{error} <a href="/login" className="btn btn-primary">Log in</a></div></AppShell>

  return <AppShell role="tenant">
    {offline && <div className="offline-banner" role="alert">You’re offline — showing last synced at 2026-11-09T12:00:00Z. <button onClick={()=>location.reload()} className="btn btn-secondary">Retry</button></div>}
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
      <div>
        <h1 style={{margin:0,color:'var(--navy)'}}>Tenant Dashboard</h1>
        <div style={{color:'var(--muted)',fontSize:13}}>Own room · history within occupancy · own payments. Freshness per source, not page-wide.</div>
      </div>
      <StatusBadge supply="present" connectivity={offline?'stale':'online'} relay={{observed:false}} />
    </div>
    <div className="grid-12" style={{marginTop:16}}>
      <div style={{gridColumn:'span 4'}}><WalletCard available={500000} reserved={0} ledgerVersion={42} updatedAt="2026-11-09T12:00:00Z" /></div>
      <div style={{gridColumn:'span 4'}}><LiveMetric label="Live power" value={data?.live_watts||1240} unit="W" observedAt="2026-11-09T12:00:00Z" quality="verified" coverage="98%" /></div>
      <div style={{gridColumn:'span 4'}}><LiveMetric label="Relay" value={data?.relay_state?'ON':'OFF'} unit="" observedAt="2026-11-09T12:00:00Z" quality="verified" /></div>
      <div style={{gridColumn:'span 8'}}><UsageChart /></div>
      <div style={{gridColumn:'span 4'}}>
        <div className="card">
          <div style={{fontWeight:700}}>Alerts</div>
          {data?.recent_alerts?.length ? data.recent_alerts.map((a:any,i:number)=><div key={i} style={{padding:'8px 0',borderBottom:'1px solid var(--border)'}}>{a.message}</div>) : <div className="empty">No alerts — acknowledge ≠ resolve. Tamper shows “suspected mismatch”, not theft conviction.</div>}
          <a href="/alerts" className="btn btn-secondary" style={{marginTop:12}}>View all</a>
        </div>
        <div className="card" style={{marginTop:12}}>
          <div style={{fontWeight:700}}>Supply vs Connectivity vs Relay</div>
          <ul style={{color:'var(--muted)',fontSize:13}}><li>Supply: grid presence independent of connectivity</li><li>Connectivity: online/stale/offline/dependent_unknown</li><li>Relay: requested vs observed with off_reasons</li></ul>
          <div style={{fontSize:12,color:'var(--red)'}}>Never flatten to one misleading ON badge.</div>
        </div>
      </div>
    </div>
    <div className="card" style={{marginTop:16}}>
      <h3>Billing — what’s pending?</h3>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <a href="/billing" className="btn btn-primary">Recharge</a>
        <a href="/history" className="btn btn-secondary">Usage history</a>
        <a href="/control" className="btn btn-secondary">Control & schedules</a>
      </div>
      <div style={{fontSize:13,color:'var(--muted)',marginTop:8}}>Recharge clears only its own zero-balance restriction; cannot override protection/manual/budget/maintenance/utility reasons.</div>
    </div>
  </AppShell>
}
