'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

type Role = 'tenant'|'landlord'|'homeowner'|'installer'|'agent'|'referrer'|'nepa_staff'|'internal_ops'|'internal_finance'|'internal_support'|'internal_engineering'|'internal_superadmin'

const navByRole: Record<string, {label:string,href:string}[]> = {
  tenant: [
    {label:'Home',href:'/dashboard/tenant'},
    {label:'History',href:'/history'},
    {label:'Billing',href:'/billing'},
    {label:'Control',href:'/control'},
    {label:'Alerts',href:'/alerts'},
  ],
  landlord: [
    {label:'Portfolio',href:'/dashboard/landlord'},
    {label:'Buildings',href:'/dashboard/landlord'},
    {label:'History',href:'/history'},
    {label:'Billing',href:'/billing'},
    {label:'Community',href:'/community'},
  ],
  homeowner: [
    {label:'Home',href:'/dashboard/homeowner'},
    {label:'History',href:'/history'},
    {label:'Billing',href:'/billing'},
    {label:'Alerts',href:'/alerts'},
  ],
  default: [
    {label:'Home',href:'/'},
    {label:'History',href:'/history'},
    {label:'Billing',href:'/billing'},
    {label:'Alerts',href:'/alerts'},
  ]
}

export default function AppShell({ children, role='tenant' }: { children: React.ReactNode, role?: string }) {
  const pathname = usePathname()
  const [online, setOnline] = useState(true)
  const [offlineBanner, setOfflineBanner] = useState(false)
  useEffect(()=>{
    const onOnline = ()=>{ setOnline(true); setOfflineBanner(false)}
    const onOffline= ()=>{ setOnline(false); setOfflineBanner(true)}
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    setOnline(navigator.onLine)
    return ()=>{ window.removeEventListener('online',onOnline); window.removeEventListener('offline',onOffline)}
  },[])
  const items = (navByRole[role] || navByRole.default)

  return (
    <div className="main-with-sidebar">
      <aside className="sidebar hide-mobile" aria-label="Sidebar navigation" style={{display:'flex',flexDirection:'column',gap:12}}>
        <Link href="/" style={{fontWeight:800,color:'var(--navy)',fontSize:20}}>SmartClamp</Link>
        <div style={{fontSize:13,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.05em'}}>Role: {role}</div>
        <nav aria-label="App navigation" style={{display:'flex',flexDirection:'column',gap:4}}>
          {items.map(i=>{
            const active = pathname===i.href
            return <Link key={i.href} href={i.href} style={{padding:'10px 12px',borderRadius:8,background:active?'var(--canvas)':'transparent',fontWeight:active?700:500,border:active?'1px solid var(--border)':'1px solid transparent'}}>{i.label}</Link>
          })}
          <Link href="/settings" style={{padding:'10px 12px',borderRadius:8}}>Settings</Link>
          <Link href="/support" style={{padding:'10px 12px',borderRadius:8}}>Support</Link>
          <Link href="/ops" style={{padding:'10px 12px',borderRadius:8}}>Ops</Link>
        </nav>
        <div style={{marginTop:'auto',fontSize:13,color:'var(--muted)'}}>Supply, connectivity, and relay are independent. Requested ≠ confirmed.</div>
      </aside>
      <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0}}>
        {offlineBanner && <div className="offline-banner" role="alert">You’re offline or cannot reach SmartClamp. Last synced just now. <button onClick={()=>location.reload()} className="btn btn-secondary" style={{marginLeft:12,padding:'6px 12px',minHeight:'auto'}}>Retry</button></div>}
        <header style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',background:'var(--surface)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontWeight:600}}>Dashboard</div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <span className={`badge ${online?'badge-verified':'badge-offline'}`}>{online?'Online':'Offline'}</span>
            <Link href="/settings" className="btn btn-secondary" style={{padding:'8px 12px'}}>Account</Link>
          </div>
        </header>
        <div className="main-content" id="main">
          <div aria-live="polite" className="live-region" />
          {children}
        </div>
        <nav className="bottom-nav show-mobile" aria-label="Mobile navigation">
          {items.slice(0,4).map(i=>(
            <Link key={i.href} href={i.href} style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'6px 12px',fontSize:12,fontWeight: pathname===i.href?700:500, color: pathname===i.href?'var(--navy)':'var(--muted)'}}>
              <span style={{width:24,height:24,background:pathname===i.href?'var(--navy)':'var(--border)',borderRadius:6,display:'block',marginBottom:4}} />
              {i.label}
            </Link>
          ))}
        </nav>
        <style>{`@media(max-width:1023px){.hide-mobile{display:none!important}} @media(min-width:1024px){.show-mobile{display:none!important}}`}</style>
      </div>
    </div>
  )
}
