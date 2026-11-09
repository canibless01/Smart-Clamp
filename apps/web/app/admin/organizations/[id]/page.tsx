'use client'
import AppShell from '@/components/AppShell'
import { useState } from 'react'
export default function Page({params}:{params:{id:string}}){
  const [name,setName]=useState('FUTA Energy Co-op')
  const [color,setColor]=useState('#102A43')
  const [logo,setLogo]=useState('')
  return <AppShell role="internal_superadmin">
    <h1 style={{color:'var(--navy)',margin:0}}>White Label — Organization {params.id.slice(0,8)}</h1>
    <p style={{color:'var(--muted)'}}>Organization isolation, theme constraints, approved subdomain, memberships scoped — no cross-org aggregation leak.</p>
    <div className="grid-12" style={{marginTop:16}}>
      <div className="card" style={{gridColumn:'span 6'}}>
        <h3>Branding</h3>
        <div style={{display:'grid',gap:12,marginTop:12}}>
          <div><label style={{fontWeight:600}}>Organization name</label><input className="input" value={name} onChange={e=>setName(e.target.value)} /></div>
          <div><label style={{fontWeight:600}}>Primary color (hex)</label><div style={{display:'flex',gap:8}}><input className="input" value={color} onChange={e=>setColor(e.target.value)} style={{flex:1}} /><div style={{width:44,height:44,background:color,borderRadius:8,border:'1px solid var(--border)'}} /></div><div style={{fontSize:12,color:'var(--muted)'}}>Approved constraints — not arbitrary CSS injection.</div></div>
          <div><label style={{fontWeight:600}}>Logo URL</label><input className="input" value={logo} onChange={e=>setLogo(e.target.value)} placeholder="https://…" /></div>
          <button className="btn btn-primary">Save branding</button>
        </div>
        <div style={{fontSize:12,color:'var(--muted)',marginTop:8}}>Subdomain: futa.smartclamp.ng — name/subdomain/theme with approved constraints.</div>
      </div>
      <div className="card" style={{gridColumn:'span 6'}}>
        <h3>Preview</h3>
        <div style={{border:'1px solid var(--border)',borderRadius:12,padding:16,background:'var(--canvas)'}}>
          <div style={{fontWeight:800,color:color}}>{name}</div>
          <div style={{height:8,background:color,borderRadius:4,marginTop:8}} />
          <div style={{fontSize:12,color:'var(--muted)',marginTop:8}}>Header uses primary color — scoped to org, isolated.</div>
        </div>
        <div style={{display:'flex',gap:8,marginTop:12}}>
          <a href="/dashboard/properties" className="btn btn-secondary">Portfolio</a>
          <button className="btn btn-secondary">Invite member</button>
        </div>
      </div>
    </div>
  </AppShell>
}
