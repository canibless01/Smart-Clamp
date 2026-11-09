
'use client'
import AppShell from '@/components/AppShell'
import { useState } from 'react'
export default function Page(){
  const [prefs,setPrefs]=useState({email:true,sms:true,push:true,language:'en'})
  return <AppShell role="tenant">
    <h1 style={{color:'var(--navy)',margin:0}}>Settings & Account</h1>
    <div className="grid-12" style={{marginTop:16}}>
      <div className="card" style={{gridColumn:'span 6'}}>
        <h3>Profile</h3>
        <div style={{display:'grid',gap:12,marginTop:12}}>
          <div><label style={{fontWeight:600}}>Phone</label><div className="input" style={{background:'var(--canvas)'}}>+2348012345678 · verified</div></div>
          <div><label style={{fontWeight:600}}>Full name</label><input className="input" defaultValue="Ada Lovelace" /></div>
          <div><label style={{fontWeight:600}}>Role</label><div className="input" style={{background:'var(--canvas)'}}>tenant — derived server-side from membership</div></div>
          <button className="btn btn-primary">Save</button>
        </div>
        <div style={{fontSize:12,color:'var(--muted)',marginTop:8}}>UI role cards are intent, never permission grants.</div>
      </div>
      <div className="card" style={{gridColumn:'span 6'}}>
        <h3>Notifications</h3>
        <div style={{display:'grid',gap:8,marginTop:12}}>
          <label style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><span>Email</span><input type="checkbox" checked={prefs.email} onChange={e=>setPrefs({...prefs,email:e.target.checked})} /></label>
          <label style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><span>SMS</span><input type="checkbox" checked={prefs.sms} onChange={e=>setPrefs({...prefs,sms:e.target.checked})} /></label>
          <label style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><span>Push</span><input type="checkbox" checked={prefs.push} onChange={e=>setPrefs({...prefs,push:e.target.checked})} /></label>
          <div style={{fontSize:12,color:'var(--muted)'}}>Quiet hours 21:00–07:00 Lagos — critical bypasses. Opt-out applies optional channels; critical in-app facts remain.</div>
          <button className="btn btn-primary">Save preferences</button>
        </div>
      </div>
      <div className="card" style={{gridColumn:'span 6'}}>
        <h3>Security</h3>
        <div style={{display:'grid',gap:8}}>
          <button className="btn btn-secondary">Change password</button>
          <button className="btn btn-secondary">Manage step-up (SMS)</button>
          <a href="/settings/utility-control" className="btn btn-secondary">Utility control consent</a>
          <button className="btn btn-secondary">Active sessions</button>
          <button className="btn" style={{background:'var(--red)',color:'white'}}>Log out — clears cache</button>
        </div>
      </div>
      <div className="card" style={{gridColumn:'span 6'}}>
        <h3>Data & Privacy</h3>
        <div style={{display:'grid',gap:8}}>
          <a href="/verification-reports/demo-token" className="btn btn-secondary">Verification reports</a>
          <a href="/devices/demo-id" className="btn btn-secondary">Device viewers — 2 viewers</a>
          <a href="/settings/subscription" className="btn btn-secondary">Subscription</a>
          <a href="/settings/smart-devices" className="btn btn-secondary">Linked smart devices</a>
        </div>
        <div style={{fontSize:12,color:'var(--muted)',marginTop:8}}>Logout clears cache; occupancy transfer/revocation invalidates grants.</div>
      </div>
    </div>
  </AppShell>
}
