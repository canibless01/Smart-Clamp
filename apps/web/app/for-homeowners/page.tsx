import PublicShell from '@/components/PublicShell'
export default function Page(){
  return <PublicShell>
    <div className="container" style={{padding:'32px 0'}}>
      <h1 style={{color:'var(--navy)'}}>For Homeowners</h1>
      <p style={{color:'var(--muted)'}}>Single-home Basic monitors; Basic Pro adds analytics; Pro adds relay on the same pole device — not a separate Sub device.</p>
      <div className="grid-12" style={{marginTop:24}}>
        <div className="card" style={{gridColumn:'span 6'}}><h3>Basic</h3><p>Live graph, history, verification, reports.</p></div>
        <div className="card" style={{gridColumn:'span 6'}}><h3>Pro</h3><p>Eligible control requires commissioning, step-up, and OFF-reason checks.</p></div>
      </div>
      <a href="/dashboard/homeowner" className="btn btn-primary" style={{marginTop:16}}>Homeowner dashboard</a>
    </div>
  </PublicShell>
}
