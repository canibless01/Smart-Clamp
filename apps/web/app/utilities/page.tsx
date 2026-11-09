'use client'
import AppShell from '@/components/AppShell'
export default function Page(){
  return <AppShell role="tenant">
    <h1 style={{color:'var(--navy)',margin:0}}>Water & Gas Vending</h1>
    <p style={{color:'var(--muted)'}}>Utility-aware accounting — no borrowed electricity relay/sensor logic for water/gas. Phase 5 — separate from electricity pilot.</p>
    <div className="card" style={{marginTop:16}}>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <span className="badge badge-unknown">Phase 5 — not yet live</span>
        <span className="badge badge-stale">Requires utility-aware accounting</span>
      </div>
      <div className="grid-12" style={{marginTop:16}}>
        <div className="card" style={{gridColumn:'span 6',background:'var(--canvas)'}}>
          <div style={{fontWeight:700}}>Water vending</div>
          <div style={{fontSize:13,color:'var(--muted)'}}>Prepaid water meter vending via existing wallet patterns. No relay — meter valve is utility-controlled.</div>
          <button className="btn btn-secondary" style={{marginTop:8}} disabled>Coming soon</button>
        </div>
        <div className="card" style={{gridColumn:'span 6',background:'var(--canvas)'}}>
          <div style={{fontWeight:700}}>Gas vending</div>
          <div style={{fontSize:13,color:'var(--muted)'}}>Separate accounting, safety interlocks. Never apply electricity CT/relay assumptions.</div>
          <button className="btn btn-secondary" style={{marginTop:8}} disabled>Coming soon</button>
        </div>
      </div>
      <div style={{fontSize:12,color:'var(--muted)',marginTop:12}}>All utility types use Quote → payment → vending (distinct stages). Water/gas never reuses electricity relay drivers.</div>
      <a href="/billing" className="btn btn-primary" style={{marginTop:12}}>Back to electricity billing</a>
    </div>
  </AppShell>
}
