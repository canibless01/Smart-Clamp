'use client'
import PublicShell from '@/components/PublicShell'
import { useState } from 'react'
export default function Page(){
  const [step,setStep]=useState(1)
  return <PublicShell>
    <div className="container" style={{padding:'32px 0'}}>
      <h1 style={{color:'var(--navy)'}}>IR-Reader — Optical Meter Link</h1>
      <p style={{color:'var(--muted)',maxWidth:720}}>For supported meters only. Reads DLMS/COSEM via optical port with meter-specific association, timing, OBIS mappings. Never fake balance for unsupported models.</p>
      
      <div style={{display:'flex',gap:8,marginBottom:24,flexWrap:'wrap'}}>
        {[1,2,3,4].map(s=><button key={s} onClick={()=>setStep(s)} className={`btn ${step===s?'btn-primary':'btn-secondary'}`}>Step {s}</button>)}
      </div>

      {step===1 && <div className="card">
        <h3>1. Check Compatibility</h3>
        <p style={{color:'var(--muted)'}}>IR-Reader works only with approved meter models. We validate manufacturer controls separately with explicit permission.</p>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:12}}>
          <div className="badge badge-verified">✓ Landis+Gyr E350</div>
          <div className="badge badge-verified">✓ Conlog BEC</div>
          <div className="badge badge-stale">⚠ Elster AS1440 (beta)</div>
          <div className="badge badge-unknown">✗ Generic pulse (unsupported)</div>
        </div>
        <div style={{marginTop:16}}>
          <input className="input" placeholder="Enter meter model or number to check" style={{maxWidth:400}} />
          <button onClick={()=>setStep(2)} className="btn btn-primary" style={{marginTop:8}}>Check support</button>
        </div>
      </div>}

      {step===2 && <div className="card">
        <h3>2. Order IR-Reader</h3>
        <div className="grid-12">
          <div style={{gridColumn:'span 6'}}>
            <div style={{border:'1px solid var(--border)',borderRadius:12,padding:16}}>
              <div style={{fontWeight:700}}>IR-Reader Unit</div>
              <div style={{fontSize:13,color:'var(--muted)'}}>Optical probe + ESP32 Hub + mounting. Price pending procurement.</div>
              <div style={{fontWeight:800,marginTop:8}}>Pricing being finalized</div>
              <button onClick={()=>setStep(3)} className="btn btn-primary" style={{marginTop:12,width:'100%'}}>Order — pending quote</button>
              <div style={{fontSize:11,color:'var(--muted)',marginTop:8}}>Hardware + install handled separately; no price invented.</div>
            </div>
          </div>
          <div style={{gridColumn:'span 6'}}>
            <h4>What's in the box</h4>
            <ul>
              <li>IR optical probe (IEC 62056-21)</li>
              <li>Building Hub (RS485 master + GSM)</li>
              <li>Mounting bracket + calibration doc</li>
              <li>Commissioning checklist</li>
            </ul>
            <div style={{fontSize:12,color:'var(--red)'}}>Optical timing/baud/OBIS require meter-specific adapter — no universal driver.</div>
          </div>
        </div>
      </div>}

      {step===3 && <div className="card">
        <h3>3. Install & Pair</h3>
        <p style={{color:'var(--muted)'}}>Board role identification → BLE provisioning → topology assignment → diagnostics → commissioning.</p>
        <div style={{display:'grid',gap:12,marginTop:16}}>
          <div style={{display:'flex',gap:12,alignItems:'center'}}><div style={{width:32,height:32,background:'var(--navy)',color:'white',borderRadius:999,display:'grid',placeItems:'center'}}>1</div><div><strong>Scan</strong> — Installer app detects Hub via BLE</div></div>
          <div style={{display:'flex',gap:12,alignItems:'center'}}><div style={{width:32,height:32,background:'var(--navy)',color:'white',borderRadius:999,display:'grid',placeItems:'center'}}>2</div><div><strong>Provision</strong> — Write peer credentials, calibration, topology (time-limited provisioning window)</div></div>
          <div style={{display:'flex',gap:12,alignItems:'center'}}><div style={{width:32,height:32,background:'var(--navy)',color:'white',borderRadius:999,display:'grid',placeItems:'center'}}>3</div><div><strong>Calibrate</strong> — Optical timing + OBIS mapping + phase check</div></div>
          <div style={{display:'flex',gap:12,alignItems:'center'}}><div style={{width:32,height:32,background:'var(--navy)',color:'white',borderRadius:999,display:'grid',placeItems:'center'}}>4</div><div><strong>Commission</strong> — Device proves possession, reports hash, backend claims ownership atomically</div></div>
        </div>
        <button onClick={()=>setStep(4)} className="btn btn-primary" style={{marginTop:16}}>Mark installed</button>
      </div>}

      {step===4 && <div className="card">
        <h3>4. Verification</h3>
        <div style={{background:'#E6F4EA',padding:16,borderRadius:12}}>
          <div style={{fontWeight:700,color:'var(--green)'}}>✓ Commissioned</div>
          <div style={{fontSize:13,marginTop:8}}>Device online, first reading received, ownership claimed. Dashboard now shows live data.</div>
        </div>
        <div style={{display:'flex',gap:8,marginTop:16}}>
          <a href="/dashboard/homeowner" className="btn btn-primary">View dashboard</a>
          <a href="/devices/demo-id" className="btn btn-secondary">Device diagnostics</a>
        </div>
      </div>}
    </div>
  </PublicShell>
}