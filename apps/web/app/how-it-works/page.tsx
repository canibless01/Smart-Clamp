import PublicShell from '@/components/PublicShell'
export default function Page(){
  return <PublicShell>
    <div className="container" style={{padding:'32px 0'}}>
      <h1 style={{color:'var(--navy)'}}>How It Works</h1>
      <p style={{color:'var(--muted)',maxWidth:720}}>Measurement → transport → verification → optional control. With/without-meter explanations and installation boundaries.</p>
      <div className="grid-12" style={{marginTop:24}}>
        <div className="card" style={{gridColumn:'span 6'}}>
          <h3>With Meter — Building + Rooms</h3>
          <p style={{color:'var(--muted)'}}>Building Hub (RS485) and Pole Gateway (ESP-NOW) upload independently; cloud correlates. Central-meter vending and internal room accounting reconcile separately.</p>
          <ul><li>House Full per room → Building Hub → TLS ingest</li><li>Pole Device → Pole Gateway → TLS ingest</li><li>Durable ACK authorizes deletion</li></ul>
        </div>
        <div className="card" style={{gridColumn:'span 6'}}>
          <h3>Without Meter — Allocation</h3>
          <p style={{color:'var(--muted)'}}>Provisional price = latest bill / matched-period building kWh + disclosed margin. Final = room kWh / building kWh × bill. Zero denominator blocks auto-allocation.</p>
          <div className="error-panel">Settlement cadence unresolved — this model is disabled until business sign-off. Do not launch.</div>
        </div>
        <div className="card" style={{gridColumn:'span 6'}}>
          <h3>Verification</h3>
          <p>Transformer vs SUM(downstream poles) 10%, pole vs rooms+common 8%, clamp vs meter 5%. 95% coverage, matched 5-min UTC windows, 3 consecutive eligible windows → suspected_mismatch. No fabricated verified badge.</p>
        </div>
        <div className="card" style={{gridColumn:'span 6'}}>
          <h3>Installation Safety</h3>
          <p style={{color:'var(--muted)'}}>Clip-on CT alone is safe; mains voltage/relay work requires qualified installer, isolation and enclosure. No claim live work is safe without isolation.</p>
          <a href="/install" className="btn btn-primary">Request install</a>
        </div>
      </div>
    </div>
  </PublicShell>
}
