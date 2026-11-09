'use client'
import AppShell from '@/components/AppShell'
import { useEffect, useState } from 'react'
import { API_BASE } from '@/lib/api'

export default function Page(){
  const [buildings,setBuildings]=useState<any[]>([])
  const [loading,setLoading]=useState(true)
  useEffect(()=>{
    const token=localStorage.getItem('smartclamp_token')
    if (!token){ setLoading(false); return }
    fetch(`${API_BASE}/buildings`,{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.json()).then(d=>setBuildings(d.items||[])).finally(()=>setLoading(false))
  },[])
  return <AppShell role="landlord">
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <h1 style={{color:'var(--navy)',margin:0}}>Landlord Dashboard</h1>
      <a href="/dashboard/landlord/buildings/new" className="btn btn-primary">Create building</a>
    </div>
    <p style={{color:'var(--muted)'}}>Owned building scope enforced; transfer preserves history and revokes old access; bulk maintenance uses step-up.</p>
    {loading ? <div aria-busy="true" className="skeleton" style={{height:120}} /> :
      buildings.length===0 ? <div className="empty">No buildings yet. Create one to add rooms and invite tenants. <a href="/dashboard/landlord/buildings/new" className="btn btn-primary">Create building</a></div> :
      <div className="grid-12" style={{marginTop:16}}>
        {buildings.map((b:any)=><div key={b.building_id||b.id} className="card" style={{gridColumn:'span 6'}}>
          <div style={{fontWeight:700}}>{b.name}</div>
          <div style={{color:'var(--muted)',fontSize:13}}>{b.address} · {b.meter_type} · {b.region}</div>
          <div style={{display:'flex',gap:8,marginTop:12,flexWrap:'wrap'}}>
            <a href={`/dashboard/landlord/buildings/${b.building_id||b.id}/rooms`} className="btn btn-secondary">Manage rooms</a>
            <a href={`/billing`} className="btn btn-secondary">Accounting</a>
            <button className="btn btn-secondary">Bulk maintenance</button>
          </div>
          <div style={{fontSize:12,color:'var(--red)',marginTop:8}}>Landlords cannot use power control to enforce rent debts.</div>
        </div>)}
      </div>
    }
    <div className="grid-12" style={{marginTop:16}}>
      <div className="card" style={{gridColumn:'span 4'}}><div style={{fontWeight:700}}>Rooms</div><div className="skeleton" style={{height:16,marginTop:8}} /><div style={{fontSize:13,color:'var(--muted)'}}>Room grid with occupancy status, invite, transfer.</div></div>
      <div className="card" style={{gridColumn:'span 4'}}><div style={{fontWeight:700}}>Collected / Owed</div><div style={{fontSize:24,fontWeight:800}}>₦120,000</div><div style={{color:'var(--muted)',fontSize:13}}>Revenue from finance inputs, not wallet liabilities.</div></div>
      <div className="card" style={{gridColumn:'span 4'}}><div style={{fontWeight:700}}>Flags</div><div style={{fontSize:24,fontWeight:800}}>0 active</div><a href="/alerts">Inspect →</a></div>
    </div>
  </AppShell>
}
