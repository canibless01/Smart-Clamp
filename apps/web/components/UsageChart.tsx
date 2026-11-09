'use client'
export default function UsageChart({ data }: { data?: {time:string,kwh:number}[] }) {
  const d = data || Array.from({length:12},(_,i)=>({time:`${i*2}:00`,kwh: Math.round(0.2 + Math.random()*1.2 *100)/100}))
  const max = Math.max(...d.map(x=>x.kwh),0.1)
  return (
    <div className="card">
      <div style={{fontWeight:700,marginBottom:12}}>Usage (kWh) — 24h</div>
      <div role="img" aria-label="Usage chart showing kWh over time" style={{display:'flex',alignItems:'end',gap:6,height:120,padding:'8px 0'}}>
        {d.map((pt,i)=>(
          <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
            <div style={{width:'100%',height:`${(pt.kwh/max)*90}px`,background:'var(--navy)',borderRadius:'4px 4px 0 0',minHeight:4}} title={`${pt.time}: ${pt.kwh} kWh`} />
            <span style={{fontSize:10,color:'var(--muted)'}}>{pt.time}</span>
          </div>
        ))}
      </div>
      <table style={{width:'100%',marginTop:12,fontSize:13}}>
        <thead><tr><th>Time (Africa/Lagos)</th><th>kWh</th></tr></thead>
        <tbody>{d.map((r,i)=><tr key={i}><td>{r.time}</td><td>{r.kwh.toFixed(2)}</td></tr>)}</tbody>
      </table>
      <div style={{marginTop:8,fontSize:13,color:'var(--muted)'}}>Gaps show missing readings; not zero usage. Times stored UTC, displayed Africa/Lagos.</div>
    </div>
  )
}
