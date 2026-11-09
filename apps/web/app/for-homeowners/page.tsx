import PublicShell from '@/components/PublicShell'
export default function Page(){
  return <PublicShell>
    <div className="container" style={{padding:'32px 0'}}>
      <h1 style={{color:'var(--navy)'}}>For Homeowners — Single Home</h1>
      <p style={{color:'var(--muted)',maxWidth:720}}>Single-home Basic monitors; Basic Pro adds analytics; Pro adds relay on same pole device — never a redundant Sub device.</p>
      <div className="grid-12" style={{marginTop:24}}>
        <div className="card" style={{gridColumn:'span 4'}}><h3>Basic</h3><p style={{color:'var(--muted)'}}>Live graph, history, verification (complete intervals), reports. No control elements.</p><a href="/dashboard/homeowner" className="btn btn-primary">Dashboard</a></div>
        <div className="card" style={{gridColumn:'span 4'}}><h3>Basic Pro</h3><p style={{color:'var(--muted)'}}>Bill forecast, load signatures, power factor, peer benchmark, hash-chained evidence, scheduled reports, SMS/USSD query, revocable viewers.</p><a href="/pricing" className="btn btn-secondary">Compare plans</a></div>
        <div className="card" style={{gridColumn:'span 4'}}><h3>Pro</h3><p style={{color:'var(--muted)'}}>Eligible control requires commissioning + step-up + OFF-reason checks. Single-home Pro is capability variant of pole_device/pole_gateway, not seventh physical role.</p><a href="/control" className="btn btn-secondary">Control</a></div>
      </div>
      <div className="card" style={{marginTop:16}}>
        <h3>Hardware</h3>
        <p style={{color:'var(--muted)'}}>Pole measurement via 100A CT + voltage; no redundant Sub device. Classic ESP32 DevKit pins centralized in hardware_config.hpp — not one-line substitution.</p>
        <a href="/install" className="btn btn-secondary">Install</a>
      </div>
    </div>
  </PublicShell>
}
