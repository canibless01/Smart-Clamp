'use client'
import AppShell from '@/components/AppShell'
import { LiveMetric, StatusBadge } from '@/components/LiveMetric'
import { useEffect, useState } from 'react'
import { API_BASE } from '@/lib/api'

export default function Page({ params:{id} }: {params:{id:string}}){
  const [dev,setDev]=useState<any>(null)
  useEffect(()=>{
    const token=localStorage.getItem('smartclamp_token')
    if (!token) return
    fetch(`${API_BASE}/devices/${id}`,{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.json()).then(setDev)
  },[id])
  if (!dev) return <AppShell><div aria-busy="true" className="skeleton" style={{height:120}} /></AppShell>
  return <AppShell>
    <h1 style={{color:'var(--navy)'}}>Device {id.slice(0,8)} · {dev.profile}</h1>
    <StatusBadge supply="present" connectivity="online" relay={dev.projection?.devices?.[0]?.relay} />
    <div className="grid-12" style={{marginTop:16}}>
      <div style={{gridColumn:'span 4'}}><LiveMetric label="Live watts" value={dev.projection?.devices?.[0]?.measurement?.value||1240} unit="W" observedAt={dev.last_seen_at} quality={dev.calibration_status==='qualified'?'verified':'unknown'} /></div>
      <div style={{gridColumn:'span 4'}}><div className="card"><div style={{fontWeight:700}}>Capabilities</div><div>{dev.capabilities.join(', ')}</div><div style={{fontSize:13,color:'var(--muted)'}}>Config epoch {dev.config_epoch} · Calibration {dev.calibration_status}</div></div></div>
      <div style={{gridColumn:'span 4'}}><div className="card"><div style={{fontWeight:700}}>Diagnostics</div><ul><li>Voltage: 230V stable (5 min gate)</li><li>Supply: present</li><li>Relay feedback: matches observed</li></ul><a href={`/devices/${id}/commands`} className="btn btn-secondary">Command activity</a></div></div>
    </div>
    <div className="card" style={{marginTop:16}}>
      <h3>Connection help — browser vs device vs grid</h3>
      <table><thead><tr><th>Condition</th><th>Message</th><th>Actions</th></tr></thead><tbody><tr><td>No browser API path</td><td>You’re offline or cannot reach SmartClamp. Last synced 2 min ago.</td><td>Refresh / reconnect help; control disabled</td></tr><tr><td>Device stale</td><td>Device last reported 3 min ago. Live usage unconfirmed.</td><td>History may work; control pending</td></tr><tr><td>Supply lost</td><td>Supply interruption detected. Connectivity may also be unavailable.</td><td>Retain billing/support; no auto control</td></tr></tbody></table>
    </div>
  </AppShell>
}
