import PublicShell from '@/components/PublicShell'
export default function Page(){
  const tiers=[
    {name:'Free',price:'₦0',desc:'Anonymous validation only',features:['Meter validation (masked)','Public device view','No live data'],cta:'Check meter',href:'/#meter'},
    {name:'Basic',price:'Pricing being finalized',desc:'For tenants & homeowners',features:['Live usage & history','Alerts & community','Device verification','Monthly report']},
    {name:'Basic Pro',price:'Pricing being finalized',desc:'Analytics',features:['Bill forecast','Load signatures','Power factor','Peer benchmark','Hash-chained evidence','SMS/USSD query'],highlight:true},
    {name:'Pro',price:'Pricing being finalized',desc:'Control where hardware supports it',features:['All Pro analytics','Eligible relay control','Schedules & budgets','Bulk maintenance (landlord)'],highlight:true},
  ]
  return <PublicShell>
    <div className="container" style={{padding:'32px 0'}}>
      <h1 style={{color:'var(--navy)',textAlign:'center'}}>Pricing — electricity credit is separate from subscription</h1>
      <p style={{textAlign:'center',color:'var(--muted)',maxWidth:720,margin:'12px auto'}}>Free validation ₦0. Platform subscription is recurring; electricity credit is pay-as-you-go; hardware and install are separate. Unapproved paid prices read “Pricing being finalized”, not fabricated naira figures.</p>
      <div className="grid-12" style={{marginTop:32}}>
        {tiers.map(t=>(
          <div key={t.name} className="card" style={{gridColumn:'span 3',border: t.highlight?'2px solid var(--amber)':'1px solid var(--border)'}}>
            <div style={{fontWeight:800,color:'var(--navy)'}}>{t.name}</div>
            <div style={{fontSize:20,fontWeight:700,margin:'8px 0'}}>{t.price}</div>
            <div style={{color:'var(--muted)',fontSize:13}}>{t.desc}</div>
            <ul style={{paddingLeft:18,marginTop:12}}>{t.features.map(f=><li key={f}>{f}</li>)}</ul>
            <a href={t.href||'/signup'} className={`btn ${t.highlight?'btn-amber':'btn-primary'}`} style={{marginTop:16,width:'100%'}}>{t.cta||'Get started'}</a>
          </div>
        ))}
      </div>
      <div className="card" style={{marginTop:24}}>
        <h3>Shared housing? Talk to us.</h3>
        <p style={{color:'var(--muted)'}}>Building pricing uses per-room allocation and central-meter vending. No-meter model pending business sign-off — provisional unit price uses latest bill / matched building kWh + disclosed margin; final allocation room kWh / building kWh × bill.</p>
        <a href="/support" className="btn btn-secondary">Contact sales</a>
      </div>
      <div style={{marginTop:24,fontSize:13,color:'var(--muted)'}}>Source disclaimer: Future pricing is pending procurement. Do not publish final prices, untested accuracy, install-time guarantees, fabricated testimonials, universal meter compatibility, or certification claims.</div>
    </div>
  </PublicShell>
}
