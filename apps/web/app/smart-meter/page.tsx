'use client'

import PublicShell from '@/components/PublicShell'
import { useState } from 'react'
import { API_BASE } from '@/lib/api'
export default function Page(){
  const [meter,setMeter]=useState('')
  const [state,setState]=useState<'idle'|'checking'|'valid'|'invalid'|'unsupported'|'error'>('idle')
  const [result,setResult]=useState<any>(null)
  async function validate(){
    if (!meter.trim()) return
    setState('checking')
    try{
      const res=await fetch(`${API_BASE}/meters/validate`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({meter_number:meter,utility_type:'electricity'})})
      const data=await res.json()
      if (!res.ok){ setState(data.code==='unsupported'?'unsupported':'error'); return }
      if (!data.valid){ setState('invalid'); return }
      setResult(data); setState('valid')
    }catch{ setState('error') }
  }
  return <PublicShell>
    <div className="container" style={{padding:'32px 0'}}>
      <h1 style={{color:'var(--navy)'}}>Already Have a Smart Meter?</h1>
      <p style={{color:'var(--muted)',maxWidth:720}}>Anonymous validation — no signup needed. IR-Reader enables supported meter readings; manual readings retain provenance and are not equivalent to calibrated measurements.</p>
      
      <div className="grid-12" style={{marginTop:24}}>
        <div className="card" style={{gridColumn:'span 6'}}>
          <h3>Validate Your Meter</h3>
          <p style={{color:'var(--muted)',fontSize:13}}>We confirm account identity only — masked name/address, rate-limited, no full address exposure.</p>
          <div style={{display:'flex',gap:8,marginTop:12}}>
            <input className="input" value={meter} onChange={e=>setMeter(e.target.value)} placeholder="04217839011" style={{flex:1}} />
            <button onClick={validate} disabled={state==='checking'} className="btn btn-primary">{state==='checking'?'Checking…':'Validate'}</button>
          </div>
          {state==='valid' && result && <div style={{marginTop:12,padding:12,background:'#E6F4EA',borderRadius:8}}>
            <div style={{fontWeight:700,color:'var(--green)'}}>✓ Valid — {result.customer_name}</div>
            <div style={{fontSize:13}}>{result.address} · {result.disco_name}</div>
            <div style={{fontSize:12,color:'var(--muted)',marginTop:8}}>Validation confirms this account. Live balance requires a supported connection. <a href="/signup" style={{fontWeight:600}}>Save with account →</a></div>
            <div style={{display:'flex',gap:8,marginTop:12}}>
              <a href="/ir-reader/setup" className="btn btn-primary">Explore IR-Reader</a>
              <a href="/meters/link" className="btn btn-secondary">Link meter</a>
            </div>
          </div>}
          {state==='invalid' && <div className="error-panel" style={{marginTop:12}}>Meter not found — check number and try again.</div>}
          {state==='unsupported' && <div className="error-panel" style={{marginTop:12}}>Unsupported meter model. IR-Reader requires approved models — see supported list.</div>}
          {state==='error' && <div className="error-panel" style={{marginTop:12}}>Provider unavailable. <button onClick={validate} className="btn btn-secondary">Retry</button></div>}
          {state==='checking' && <div aria-busy="true" className="skeleton" style={{height:20,marginTop:12}} />}
        </div>
        <div className="card" style={{gridColumn:'span 6'}}>
          <h3>Two Paths for Existing Meters</h3>
          <div style={{display:'grid',gap:12,marginTop:12}}>
            <div style={{border:'1px solid var(--border)',borderRadius:12,padding:16}}>
              <div style={{fontWeight:700}}>IR-Reader (Optical)</div>
              <div style={{fontSize:13,color:'var(--muted)'}}>Clip over meter's optical port → reads DLMS/COSEM. Requires approved meter model + association keys. Not universal IR UART.</div>
              <a href="/ir-reader/setup" className="btn btn-secondary" style={{marginTop:8}}>Order IR-Reader</a>
            </div>
            <div style={{border:'1px solid var(--border)',borderRadius:12,padding:16}}>
              <div style={{fontWeight:700}}>Manual + Evidence</div>
              <div style={{fontSize:13,color:'var(--muted)'}}>Photo + reading entry. Retains provenance, not equivalent to calibrated measurement. Auditable.</div>
              <a href="/meters/link" className="btn btn-secondary" style={{marginTop:8}}>Link & submit reading</a>
            </div>
          </div>
          <div style={{fontSize:12,color:'var(--red)',marginTop:12}}>Never imply payment credits physical meter until provider confirms vending.</div>
        </div>
      </div>
    </div>
  </PublicShell>
}