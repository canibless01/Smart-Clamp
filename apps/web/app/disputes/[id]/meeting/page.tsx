'use client'
import AppShell from '@/components/AppShell'
export default function Page({params}:{params:{id:string}}){
  return <AppShell role="tenant">
    <h1 style={{color:'var(--navy)',margin:0}}>Meeting Mode — {params.id.slice(0,8)}</h1>
    <p style={{color:'var(--muted)'}}>Stripped-down data-minimized view for in-person resolution — same scoped snapshot, excludes unrelated personal data.</p>
    <div className="grid-12" style={{marginTop:16}}>
      <div className="card" style={{gridColumn:'span 8'}}>
        <h3>Usage — Disputed Period</h3>
        <div style={{display:'flex',gap:8,alignItems:'end',height:80,marginTop:12}}>
          {[0.8,1.2,0.9,1.4,1.0].map((v,i)=><div key={i} style={{flex:1,height:v*40,background:'var(--navy)',borderRadius:'4px 4px 0 0'}} />)}
        </div>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'var(--muted)',marginTop:4}}><span>Nov 1</span><span>Nov 15</span><span>Nov 30</span></div>
        <div style={{fontSize:12,color:'var(--muted)',marginTop:8}}>Snapshot hash: a3f9… · Stored bytes verified, never recomputed from mutable live rows.</div>
      </div>
      <div className="card" style={{gridColumn:'span 4'}}>
        <h3>Bill Breakdown</h3>
        <div style={{display:'flex',justifyContent:'space-between'}}><span>Flat rate</span><span>₦50/kWh</span></div>
        <div style={{display:'flex',justifyContent:'space-between'}}><span>Usage</span><span>142 kWh</span></div>
        <hr style={{border:'none',borderTop:'1px solid var(--border)',margin:'8px 0'}} />
        <div style={{display:'flex',justifyContent:'space-between',fontWeight:700}}><span>Total</span><span>₦7,100</span></div>
        <div style={{fontSize:12,color:'var(--muted)',marginTop:8}}>Immutable tariff version + period — prior invoices never rewritten.</div>
      </div>
      <div className="card" style={{gridColumn:'span 12'}}>
        <h3>Resolution Options</h3>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:8}}>
          <button className="btn btn-primary">Accept proposal</button>
          <button className="btn btn-secondary">Propose adjustment</button>
          <button className="btn btn-secondary">Escalate</button>
          <a href="/disputes" className="btn btn-secondary">Back to disputes</a>
        </div>
        <div style={{fontSize:11,color:'var(--muted)',marginTop:8}}>Audit every export; expiry/revocation explicit. Report canonical bytes signed with rotated key, SHA256 + issue metadata.</div>
      </div>
    </div>
  </AppShell>
}
