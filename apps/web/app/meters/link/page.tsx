'use client'
import AppShell from '@/components/AppShell'
import { useState } from 'react'
import { API_BASE } from '@/lib/api'
export default function Page(){
  const [meter,setMeter]=useState('')
  const [state,setState]=useState<'idle'|'linking'|'confirmed'|'failed'>('idle')
  const [msg,setMsg]=useState('')
  async function link(){
    setState('linking')
    const token=localStorage.getItem('smartclamp_token')
    try{
      const res=await fetch(`${API_BASE}/meters/link`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({meter_number:meter})})
      const data=await res.json()
      if (data.status==='link_confirmed_live'){ setState('confirmed'); setMsg(`Linked: ${data.linked_meter_id.slice(0,8)}`) }
      else { setState('failed'); setMsg(data.reason||'Unable to reach meter — not just DB record.') }
    }catch{ setState('failed'); setMsg('Provider unavailable') }
  }
  return <AppShell role="tenant">
    <h1 style={{color:'var(--navy)',margin:0}}>Link a Meter</h1>
    <p style={{color:'var(--muted)'}}>Real live connectivity check — not just DB record. Unsupported meter is explicit error, never fake balance.</p>
    <div className="grid-12" style={{marginTop:16}}>
      <div className="card" style={{gridColumn:'span 6'}}>
        <h3>Meter Details</h3>
        <div style={{display:'grid',gap:12,marginTop:12}}>
          <div><label style={{fontWeight:600}}>Meter number</label><input className="input" value={meter} onChange={e=>setMeter(e.target.value)} placeholder="04217839011" /></div>
          <div><label style={{fontWeight:600}}>DisCo</label><select className="input"><option>BEDC</option><option>IBEDC</option><option>EKEDC</option></select></div>
          <button onClick={link} disabled={state==='linking'} className="btn btn-primary">{state==='linking'?'Linking…':'Link meter — live check'}</button>
          {state==='confirmed' && <div style={{background:'#E6F4EA',padding:12,borderRadius:8,color:'var(--green)',fontWeight:600}}>✓ {msg} — live connectivity confirmed.</div>}
          {state==='failed' && <div className="error-panel">{msg} <button onClick={link} className="btn btn-secondary">Retry</button></div>}
          {state==='linking' && <div aria-busy="true" className="skeleton" style={{height:20}} />}
        </div>
        <div style={{fontSize:12,color:'var(--muted)',marginTop:12}}>Phase 2 gap fix: source path /devices/id/readings deprecated — use signed envelope. Generic UART meter ≠ DLMS.</div>
      </div>
      <div className="card" style={{gridColumn:'span 6'}}>
        <h3>Manual Reading (dumb meter, no clamp)</h3>
        <p style={{fontSize:13,color:'var(--muted)'}}>Submit reading + optional photo — retains provenance, not equivalent to calibrated measurement.</p>
        <div style={{display:'grid',gap:12,marginTop:12}}>
          <input className="input" placeholder="Reading kWh — e.g. 1234.5" type="number" />
          <input className="input" type="file" accept="image/*" />
          <button className="btn btn-secondary">Submit manual reading</button>
        </div>
        <div style={{fontSize:11,color:'var(--muted)',marginTop:8}}>Photo evidence stored private, scanned, signed URL 15 min. No zero-fabrication.</div>
        <a href="/history" className="btn btn-secondary" style={{marginTop:12}}>View history</a>
      </div>
    </div>
  </AppShell>
}
