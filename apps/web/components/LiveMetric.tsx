'use client'
export function LiveMetric({ label, value, unit, observedAt, quality, coverage }: { label: string, value: number|string, unit: string, observedAt: string, quality: string, coverage?: string }) {
  const isStale = quality==='stale' || quality==='gap'
  const isUnknown = value==null || value==='—'
  return (
    <div className="card">
      <div style={{fontSize:13,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.05em',fontWeight:700}}>{label}</div>
      <div style={{fontSize:32,fontWeight:800,color:'var(--navy)',marginTop:8}}>{value} <span style={{fontSize:16,fontWeight:600,color:'var(--muted)'}}>{unit}</span></div>
      <div style={{display:'flex',gap:8,marginTop:8,flexWrap:'wrap',alignItems:'center'}}>
        <span className={`badge ${isStale?'badge-stale':quality==='verified'?'badge-verified':'badge-unknown'}`}>{quality||'unknown'}</span>
        {coverage && <span style={{fontSize:13,color:'var(--muted)'}}>coverage {coverage}</span>}
        <span style={{fontSize:13,color:'var(--muted)'}}>observed {observedAt||'—'}</span>
      </div>
    </div>
  )
}
export function StatusBadge({ supply, connectivity, relay }: any) {
  return (
    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
      <span className={`badge ${supply==='present'?'badge-verified':supply==='absent'?'badge-offline':'badge-stale'}`}>Supply: {supply||'unknown'}</span>
      <span className={`badge ${connectivity==='online'?'badge-verified':connectivity==='stale'?'badge-stale':'badge-offline'}`}>Connectivity: {connectivity||'unknown'}</span>
      <span className={`badge ${relay?.observed===true?'badge-verified':relay?.observed===false?'badge-offline':'badge-unknown'}`}>Relay: {relay?.observed===true?'ON':relay?.observed===false?'OFF':'unknown'} {relay?.pending_command_id?'· pending':''}</span>
    </div>
  )
}
