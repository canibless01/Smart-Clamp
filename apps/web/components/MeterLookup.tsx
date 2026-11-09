'use client'
import { useState } from 'react'
import { API_BASE } from '@/lib/api'

type State = 'idle'|'validating'|'valid'|'not_found'|'invalid_input'|'provider_unavailable'|'rate_limited'

export default function MeterLookup() {
  const [meter, setMeter] = useState('')
  const [state, setState] = useState<State>('idle')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string>('')

  async function check() {
    const trimmed = meter.trim()
    if (!/^[0-9]{6,20}$/.test(trimmed)) {
      setState('invalid_input')
      setError('Enter 6–20 digits. Leading zeros are preserved.')
      return
    }
    setState('validating')
    setError('')
    try {
      const res = await fetch(`${API_BASE}/meters/validate`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ meter_number: trimmed, utility_type: 'electricity' })
      })
      if (res.status===429) { setState('rate_limited'); setError('Too many checks. Please wait 60 seconds.'); return }
      if (res.status===503) { setState('provider_unavailable'); setError('Provider temporarily unavailable. Try again.'); return }
      if (!res.ok) { const j=await res.json().catch(()=>({})); setState('not_found'); setError(j.message||'Meter not found. Check the number.'); return }
      const data = await res.json()
      if (!data.valid) { setState('not_found'); setError('Meter not found.'); return }
      setResult(data)
      setState('valid')
    } catch (e:any) {
      setState('provider_unavailable')
      setError('Cannot reach SmartClamp. Check your connection and try again.')
    }
  }

  return (
    <div className="card" style={{maxWidth:640}}>
      <label htmlFor="meter" style={{fontWeight:700,display:'block',marginBottom:8}}>Enter your meter number</label>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <input id="meter" className="input" value={meter} onChange={e=>setMeter(e.target.value)} placeholder="e.g. 04217839011" inputMode="numeric" pattern="[0-9]*" aria-describedby="meter-help" style={{flex:1,minWidth:200}} />
        <button onClick={check} disabled={state==='validating'} className="btn btn-primary" style={{minWidth:140}}>{state==='validating'?'Checking…':'Check meter'}</button>
      </div>
      <div id="meter-help" style={{fontSize:13,color:'var(--muted)',marginTop:8}}>We keep leading zeros. No signup required for validation.</div>

      {state==='invalid_input' && <div role="alert" className="error-panel" style={{marginTop:12}}>{error}</div>}
      {state==='rate_limited' && <div role="alert" className="error-panel" style={{marginTop:12}}>{error} <button onClick={check} className="btn btn-secondary" style={{marginLeft:8}}>Retry</button></div>}
      {state==='provider_unavailable' && <div role="alert" className="error-panel" style={{marginTop:12}}>{error} <button onClick={check} className="btn btn-secondary" style={{marginLeft:8}}>Retry</button></div>}
      {state==='not_found' && <div role="alert" className="error-panel" style={{marginTop:12}}>{error}</div>}
      {state==='valid' && result && (
        <div style={{marginTop:16,padding:16,background:'#E6F4EA',border:'1px solid #A7D8B9',borderRadius:12}}>
          <div style={{fontWeight:700,color:'var(--green)'}}>✓ Valid account</div>
          <div style={{marginTop:8,fontSize:14}}>
            {result.customer_name && <div>Customer: {result.customer_name}</div>}
            {result.address && <div>Address: {result.address}</div>}
            {result.disco_name && <div>DisCo: {result.disco_name}</div>}
          </div>
          <p style={{marginTop:12,fontSize:13,color:'var(--muted)'}}>Validation confirms this account. Live balance and history require a supported connection.</p>
          <div style={{display:'flex',gap:8,marginTop:12,flexWrap:'wrap'}}>
            <a href="/ir-reader/setup" className="btn btn-secondary">Explore IR-Reader</a>
            <a href="/signup" className="btn btn-primary">Save with an account</a>
          </div>
        </div>
      )}
      {state==='validating' && <div aria-busy="true" style={{marginTop:12}}><div className="skeleton" style={{height:20,width:'60%'}} /></div>}
    </div>
  )
}
