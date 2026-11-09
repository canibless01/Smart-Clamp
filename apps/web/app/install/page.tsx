'use client'
import AppShell from '@/components/AppShell'
import { useState } from 'react'
export default function Page(){
  const [step,setStep]=useState(1)
  const [ble,setBle]=useState<'idle'|'scanning'|'found'|'connected'|'failed'>('idle')
  return <AppShell role="installer">
    <h1 style={{color:'var(--navy)',margin:0}}>Device Pairing & Install</h1>
    <p style={{color:'var(--muted)'}}>Board role ID → BLE provisioning → topology/peer/calibration → diagnostics → commissioning checklist. No public secret entry.</p>
    <div style={{display:'flex',gap:8,marginTop:12,flexWrap:'wrap'}}>
      {[1,2,3,4,5].map(s=><button key={s} onClick={()=>setStep(s)} className={`btn ${step===s?'btn-primary':'btn-secondary'}`}>Step {s}</button>)}
    </div>
    {step===1 && <div className="card" style={{marginTop:16}}>
      <h3>1. Identify Board Role</h3>
      <div className="grid-12">
        {[
          {role:'Pole Gateway',desc:'2× CT + voltage · ESP-NOW peers · GSM uplink · optional Pro relay'},
          {role:'House Full',desc:'1× CT + voltage · RS485 · mandatory relay (disabled until commissioned)'},
          {role:'Building Hub',desc:'No sensors · RS485 master · GSM · never relay'},
          {role:'IR-Reader',desc:'Optical DLMS/COSEM · LoRa/GSM · never relay'},
        ].map(r=><div key={r.role} className="card" style={{gridColumn:'span 3'}}><div style={{fontWeight:700}}>{r.role}</div><div style={{fontSize:13,color:'var(--muted)'}}>{r.desc}</div></div>)}
      </div>
      <div style={{fontSize:12,color:'var(--muted)',marginTop:12}}>Role chosen by PlatformIO env; relay fitted is separate commissioned capability, not guessed from plan. Board variant in platformio.ini.</div>
      <button onClick={()=>setStep(2)} className="btn btn-primary" style={{marginTop:12}}>Identify →</button>
    </div>}
    {step===2 && <div className="card" style={{marginTop:16}}>
      <h3>2. BLE Provisioning (time-limited window)</h3>
      <p style={{color:'var(--muted)'}}>Authenticated BLE pairs installer, writes only matching profile/calibration/topology/peer credentials, then closes provisioning. No fallback to insecure image.</p>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:12}}>
        <button onClick={()=>{setBle('scanning'); setTimeout(()=>setBle('found'),800)}} className="btn btn-primary">Scan</button>
        <button onClick={()=>setBle('connected')} className="btn btn-secondary" disabled={ble!=='found'}>Connect</button>
        <button onClick={()=>setBle('idle')} className="btn btn-secondary">Reset</button>
        <a href="https://play.google.com" target="_blank" className="btn btn-secondary">Installer companion app →</a>
      </div>
      {ble==='scanning' && <div aria-busy="true" className="skeleton" style={{marginTop:12,height:20,width:'40%'}} />}
      {ble==='found' && <div style={{marginTop:12,padding:12,background:'#FFF4E5',borderRadius:8}}>Found: Pole Gateway A3:F2 · RSSI -42dBm · Channel 6 · <strong>Encrypted unicast</strong></div>}
      {ble==='connected' && <div style={{marginTop:12,padding:12,background:'#E6F4EA',borderRadius:8}}>✓ Connected — credentials written, provisioning window closed.</div>}
      {ble==='failed' && <div className="error-panel" style={{marginTop:12}}>BLE not supported in this browser — use installer companion path. <a href="/install" style={{fontWeight:600}}>Retry</a></div>}
      <div style={{fontSize:12,color:'var(--muted)',marginTop:12}}>Browser without BLE explains companion path. Secrets never printed or embedded in shared source. Authenticated BLE only.</div>
      <button onClick={()=>setStep(3)} className="btn btn-primary" style={{marginTop:12}}>Provision →</button>
    </div>}
    {step===3 && <div className="card" style={{marginTop:16}}>
      <h3>3. Topology & Assignment</h3>
      <div style={{display:'grid',gap:12}}>
        <div><label style={{fontWeight:600}}>Building</label><select className="input"><option>FUTA Lodge A</option><option>FUTA Lodge B</option></select></div>
        <div><label style={{fontWeight:600}}>Room / Pole group</label><select className="input"><option>Room 1</option><option>Room 2</option><option>Pole Group FUTA-1</option></select></div>
        <div><label style={{fontWeight:600}}>Peer credentials (ESP-NOW)</label><div className="input" style={{background:'var(--canvas)',fontFamily:'monospace',fontSize:12}}>per-link key: a3f9… (encrypted, rotated per device)</div></div>
      </div>
      <button onClick={()=>setStep(4)} className="btn btn-primary" style={{marginTop:12}}>Assign →</button>
    </div>}
    {step===4 && <div className="card" style={{marginTop:16}}>
      <h3>4. Diagnostics</h3>
      <div className="grid-12">
        <div className="card" style={{gridColumn:'span 4'}}><div style={{fontWeight:700}}>Signal</div><div>ESP-NOW RSSI -45dBm ✓ · RS485 response 12ms ✓</div><div style={{fontSize:12,color:'var(--muted)'}}>Max frame 200B, CRC32, 5 retries before backoff.</div></div>
        <div className="card" style={{gridColumn:'span 4'}}><div style={{fontWeight:700}}>Sensor</div><div>Voltage 231V · Current 3.2A · Power 720W · PF 0.93 ✓</div><div style={{fontSize:12,color:'var(--muted)'}}>True watts via mean(v·i), synchronous sampling, phase calibration.</div></div>
        <div className="card" style={{gridColumn:'span 4'}}><div style={{fontWeight:700}}>Relay</div><div>Coil pulse 75ms ✓ · Feedback matches ✓ · No default actuation</div></div>
      </div>
      <button onClick={()=>setStep(5)} className="btn btn-primary" style={{marginTop:12}}>Run all tests →</button>
    </div>}
    {step===5 && <div className="card" style={{marginTop:16}}>
      <h3>5. Commission</h3>
      <p style={{color:'var(--muted)'}}>Device proves possession to backend, reports firmware/config hash + diagnostics. Backend claims ownership atomically. Only then customer sees live data.</p>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:12}}>
        <button className="btn btn-primary">Confirm ownership</button>
        <a href="/devices/demo-id" className="btn btn-secondary">View diagnostics</a>
        <a href="/dashboard/tenant" className="btn btn-secondary">Go to dashboard</a>
      </div>
      <div style={{fontSize:12,color:'var(--muted)',marginTop:12}}>Failed test stays commissioning_failed with retry/RMA; no payout. Online proof + accepted commissioning creates one installer payable. Room transfer creates new occupancy, revokes old viewer/token.</div>
    </div>}
  </AppShell>
}
