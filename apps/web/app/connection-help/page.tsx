import PublicShell from '@/components/PublicShell'
export default function Page(){
  return <PublicShell>
    <div className="container" style={{padding:'32px 0'}}>
      <h1 style={{color:'var(--navy)'}}>Connection Help</h1>
      <p style={{color:'var(--muted)'}}>Browser connectivity, device connectivity, grid supply, and physical relay state are separate facts — never one generic "offline" badge.</p>
      <div className="grid-12" style={{marginTop:16}}>
        <div className="card" style={{gridColumn:'span 4'}}>
          <div style={{fontWeight:700}}>Browser has no API path</div>
          <div style={{fontSize:13,color:'var(--muted)',marginTop:4}}>"You’re offline or cannot reach SmartClamp. Last synced {`{time}`}"</div>
          <ul style={{fontSize:13}}>
            <li>Shows already-loaded snapshot</li>
            <li>Refresh / reconnect help</li>
            <li>Control/payment/role changes disabled</li>
            <li>Never queue mutations via service worker</li>
          </ul>
          <div style={{background:'#FDE8E8',padding:8,borderRadius:8,marginTop:8,fontSize:12}}>🔴 Browser offline banner — with retry button, no repeated focus steal.</div>
        </div>
        <div className="card" style={{gridColumn:'span 4'}}>
          <div style={{fontWeight:700}}>Device stale</div>
          <div style={{fontSize:13,color:'var(--muted)',marginTop:4}}>"Device last reported {`{time}`}. Live usage unconfirmed."</div>
          <ul style={{fontSize:13}}>
            <li>History/report may work</li>
            <li>Action stays pending until ACK</li>
            <li>No promise of immediate control</li>
            <li>3 heartbeats missed → stale at 180s; 24h → offline notice</li>
          </ul>
          <div style={{background:'#FFF4E5',padding:8,borderRadius:8,marginTop:8,fontSize:12}}>🟡 Stale badge — with observed_at + quality</div>
        </div>
        <div className="card" style={{gridColumn:'span 4'}}>
          <div style={{fontWeight:700}}>Source supply lost</div>
          <div style={{fontSize:13,color:'var(--muted)',marginTop:4}}>"Supply interruption {`{time/confidence}`}. Connectivity may also be unavailable."</div>
          <ul style={{fontSize:13}}>
            <li>Retains billing/history/support</li>
            <li>No automatic control request</li>
            <li>Protection delays reconnection 5 min stable</li>
            <li>Supercap log only, no guaranteed SMS</li>
          </ul>
          <div style={{background:'#EEF2F7',padding:8,borderRadius:8,marginTop:8,fontSize:12}}>⚪ Unknown / brownout 50–179V (not total outage)</div>
        </div>
        <div className="card" style={{gridColumn:'span 12'}}>
          <h3>Troubleshooting</h3>
          <div style={{display:'grid',gap:8,marginTop:12}}>
            <div style={{display:'flex',justifyContent:'space-between',padding:8,background:'var(--canvas)',borderRadius:8}}><span>API 503 ≠ browser offline</span><span>Service unavailable — not offline banner</span></div>
            <div style={{display:'flex',justifyContent:'space-between',padding:8,background:'var(--canvas)',borderRadius:8}}><span>Lookup provider 503</span><span>Affects only meter lookup/recharge — not dashboard</span></div>
            <div style={{display:'flex',justifyContent:'space-between',padding:8,background:'var(--canvas)',borderRadius:8}}><span>Account 401</span><span>One refresh → explicit sign-in with safe return path; 403 never retry as another role</span></div>
          </div>
          <div style={{display:'flex',gap:8,marginTop:16}}>
            <a href="/support" className="btn btn-primary">Contact support</a>
            <a href="/devices/demo-id" className="btn btn-secondary">Diagnostics</a>
            <button className="btn btn-secondary">Test connection</button>
          </div>
        </div>
      </div>
    </div>
  </PublicShell>
}
