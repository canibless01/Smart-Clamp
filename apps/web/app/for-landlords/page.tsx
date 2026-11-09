import PublicShell from '@/components/PublicShell'
export default function Page(){
  return <PublicShell>
    <div className="container" style={{padding:'32px 0'}}>
      <h1 style={{color:'var(--navy)'}}>For Landlords — Shared Housing</h1>
      <p style={{color:'var(--muted)',maxWidth:720}}>You own buildings, create rooms, invite tenants, transfer with history preserved, view building accounting, request maintenance bulk control with step-up. Never rent punitive cutoff.</p>
      <div className="grid-12" style={{marginTop:24}}>
        <div className="card" style={{gridColumn:'span 4'}}><h3>Rooms & Invites</h3><p style={{color:'var(--muted)'}}>Create building → add rooms → create expiring one-use invite link → tenant accepts atomically (closes/open intervals, revokes old access).</p><a href="/dashboard/landlord" className="btn btn-primary">Landlord dashboard</a></div>
        <div className="card" style={{gridColumn:'span 4'}}><h3>Transfer</h3><p style={{color:'var(--muted)'}}>Vacating closes occupancy, preserves bills, invalidates viewer/token/session. Never rewrite prior bills. New tenant sees only new interval.</p><a href="/dashboard/landlord/buildings/demo-id/rooms" className="btn btn-secondary">Building setup</a></div>
        <div className="card" style={{gridColumn:'span 4'}}><h3>Bulk Maintenance</h3><p style={{color:'var(--muted)'}}>Reason + scope + expiry (default 30 min), step-up + audit. Removes that OFF reason only; wallet_zero/budget remain.</p><a href="/control" className="btn btn-secondary">Control</a></div>
      </div>
      <div className="card" style={{marginTop:16}}>
        <h3>Pooled Wallet (no-meter)</h3>
        <p style={{color:'var(--muted)'}}>Landlord remits pooled contribution externally via custodial pass-through. Paid status needs payment evidence — not UI toggling. Missing source attribution disables generator allocation.</p>
        <div style={{display:'flex',gap:8,marginTop:12}}><a href="/billing" className="btn btn-secondary">Accounting</a><a href="/support" className="btn btn-secondary">Talk to sales</a></div>
      </div>
    </div>
  </PublicShell>
}
