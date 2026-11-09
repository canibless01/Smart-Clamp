import PublicShell from '@/components/PublicShell'
export default function Page(){
  return <PublicShell>
    <div className="container" style={{padding:'32px 0'}}>
      <h1 style={{color:'var(--navy)'}}>For Landlords</h1>
      <p style={{color:'var(--muted)'}}>Own buildings, create rooms, invite tenants, transfer with history preserved, view building accounting, request maintenance bulk control with step-up.</p>
      <div className="grid-12" style={{marginTop:24}}>
        <div className="card" style={{gridColumn:'span 4'}}><h3>Rooms & Invites</h3><p>Create building → add rooms → create expiring one-use invite → tenant accepts atomically.</p><a href="/dashboard/landlord" className="btn btn-secondary">Landlord dashboard</a></div>
        <div className="card" style={{gridColumn:'span 4'}}><h3>Transfer</h3><p>Vacating closes occupancy interval, revokes viewer/token/session, preserves bills. No rent punitive cutoff.</p></div>
        <div className="card" style={{gridColumn:'span 4'}}><h3>Maintenance Bulk OFF</h3><p>Reason, scope, expiry default 30 min, step-up and audit. Never debt enforcement.</p></div>
      </div>
    </div>
  </PublicShell>
}
