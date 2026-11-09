'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function PublicShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [solid, setSolid] = useState(false)
  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  return (
    <>
      <header className={`header ${solid ? 'solid' : ''}`} role="banner">
        <div className="container" style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',gap:16}}>
          <Link href="/" aria-label="SmartClamp home" style={{fontWeight:800,fontSize:22,color:'var(--navy)'}}>SmartClamp</Link>
          <nav aria-label="Primary" className="hide-mobile" style={{display:'flex',gap:8}}>
            <Link className="nav-link" href="/how-it-works">How It Works</Link>
            <Link className="nav-link" href="/for-landlords">For Landlords</Link>
            <Link className="nav-link" href="/for-homeowners">For Homeowners</Link>
            <Link className="nav-link" href="/pricing">Pricing</Link>
          </nav>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <Link href="/#meter" className="btn btn-secondary hide-mobile">Validate Your Meter</Link>
            <Link href="/login" className="btn btn-secondary">Log In</Link>
            <Link href="/signup" className="btn btn-primary">Sign Up</Link>
            <button aria-label="Menu" aria-expanded={menuOpen} onClick={()=>setMenuOpen(!menuOpen)} className="btn btn-secondary show-mobile" style={{display:'none'}}>☰</button>
          </div>
        </div>
        {menuOpen && (
          <div className="mobile-nav" role="dialog" aria-modal="true" aria-label="Navigation menu">
            <button onClick={()=>setMenuOpen(false)} className="btn btn-secondary" style={{alignSelf:'flex-end'}}>Close ✕</button>
            <Link className="nav-link" href="/how-it-works" onClick={()=>setMenuOpen(false)}>How It Works</Link>
            <Link className="nav-link" href="/for-landlords" onClick={()=>setMenuOpen(false)}>For Landlords</Link>
            <Link className="nav-link" href="/for-homeowners" onClick={()=>setMenuOpen(false)}>For Homeowners</Link>
            <Link className="nav-link" href="/pricing" onClick={()=>setMenuOpen(false)}>Pricing</Link>
            <Link className="nav-link" href="/about" onClick={()=>setMenuOpen(false)}>About</Link>
            <Link className="nav-link" href="/support" onClick={()=>setMenuOpen(false)}>Contact Support</Link>
            <Link href="/#meter" onClick={()=>setMenuOpen(false)} className="btn btn-primary">Validate Your Meter</Link>
          </div>
        )}
      </header>
      <main id="main">{children}</main>
      <footer style={{borderTop:'1px solid var(--border)',padding:'32px 0',marginTop:48,background:'var(--surface)'}}>
        <div className="container">
          <div className="grid-12">
            <div style={{gridColumn:'span 6'}}>
              <strong style={{color:'var(--navy)'}}>SmartClamp</strong>
              <p style={{color:'var(--muted)',maxWidth:480}}>SmartClamp provides sub-metering and verification technology. It does not generate, resell, or distribute electricity, and does not replace your utility meter.</p>
            </div>
            <div style={{gridColumn:'span 2'}}>
              <div style={{fontWeight:700,marginBottom:12}}>Product</div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                <Link href="/how-it-works">How It Works</Link>
                <Link href="/for-landlords">For Landlords</Link>
                <Link href="/for-homeowners">For Homeowners</Link>
                <Link href="/smart-meter">Already Have a Smart Meter</Link>
                <Link href="/pricing">Pricing</Link>
              </div>
            </div>
            <div style={{gridColumn:'span 2'}}>
              <div style={{fontWeight:700,marginBottom:12}}>Support</div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                <Link href="/support">Contact Support</Link>
                <Link href="/faqs">FAQs</Link>
                <Link href="/connection-help">Connection Help</Link>
                <Link href="/terms">Terms</Link>
                <Link href="/privacy">Privacy</Link>
              </div>
            </div>
            <div style={{gridColumn:'span 2'}}>
              <div style={{fontWeight:700,marginBottom:12}}>Company</div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                <Link href="/about">About</Link>
                <Link href="/install">Install</Link>
                <Link href="/ir-reader/setup">IR-Reader</Link>
              </div>
            </div>
          </div>
          <div style={{marginTop:24,paddingTop:16,borderTop:'1px solid var(--border)',color:'var(--muted)',fontSize:14}}>© 2026 SmartClamp. Piloting in the FUTA area — verified results coming soon. Legal wording pending professional review.</div>
        </div>
      </footer>
      <style>{`@media(max-width:599px){.hide-mobile{display:none!important}} @media(min-width:600px){.show-mobile{display:none!important}}`}</style>
    </>
  )
}
