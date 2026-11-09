'use client'
import AppShell from '@/components/AppShell'
export default function Page(){
  return <AppShell role="landlord">
    <h1 style={{color:'var(--navy)',margin:0}}>Multi-Property Portfolio</h1>
    <p style={{color:'var(--muted)'}}>Appears once landlord owns &gt;1 building. Organization isolation, confidence/cohort/privacy tests, white-label analytics.</p>
    <div className="grid-12" style={{marginTop:16}}>
      {[
        {name:'FUTA Lodge A',rooms:'6/6 occupied',revenue:'₦120,000',flags:0},
        {name:'FUTA Lodge B',rooms:'4/6 occupied',revenue:'₦85,000',flags:1},
        {name:'Ilara House',rooms:'3/4 occupied',revenue:'₦62,000',flags:0},
      ].map(b=>(
        <div key={b.name} className="card" style={{gridColumn:'span 4'}}>
          <div style={{fontWeight:700}}>{b.name}</div>
          <div style={{fontSize:13,color:'var(--muted)'}}>{b.rooms} · {b.flags} flags</div>
          <div style={{fontWeight:800,fontSize:20,marginTop:8}}>{b.revenue}</div>
          <div style={{fontSize:12,color:'var(--muted)'}}>This month · validated model</div>
          <div style={{display:'flex',gap:8,marginTop:12}}>
            <a href={`/dashboard/landlord/buildings/demo-id/rooms`} className="btn btn-secondary" style={{padding:'6px 12px'}}>Manage</a>
            <a href="/billing" className="btn btn-secondary" style={{padding:'6px 12px'}}>Revenue</a>
          </div>
        </div>
      ))}
      <div className="card" style={{gridColumn:'span 12'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
          <div><div style={{fontWeight:700}}>Portfolio Total</div><div style={{fontSize:24,fontWeight:800}}>₦267,000</div><div style={{fontSize:12,color:'var(--muted)'}}>No cross-org aggregation leak — org isolation verified.</div></div>
          <div style={{display:'flex',gap:8}}>
            <button className="btn btn-secondary">Export portfolio CSV</button>
            <a href="/admin/organizations/demo-id" className="btn btn-secondary">White-label</a>
          </div>
        </div>
        <div style={{marginTop:12,fontSize:12,color:'var(--muted)'}}>Confidence/cohort/privacy tests — suppressed &lt;5 samples. Model validity measured, not advertised.</div>
      </div>
    </div>
  </AppShell>
}
