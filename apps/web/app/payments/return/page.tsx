'use client'
import { useEffect, useState } from 'react'
import PublicShell from '@/components/PublicShell'
import { API_BASE } from '@/lib/api'
export default function Page(){
  const [state,setState]=useState<'pending'|'verifying'|'paid_pending_vend'|'available'|'failed'|'refund_pending'|'unknown'>('pending')
  const [ref,setRef]=useState('PS_demo_123')
  useEffect(()=>{
    const id=setTimeout(()=>setState('verifying'),800)
    const id2=setTimeout(()=>setState('paid_pending_vend'),1800)
    const id3=setTimeout(()=>setState('available'),3200)
    return ()=>{clearTimeout(id);clearTimeout(id2);clearTimeout(id3)}
  },[])
  return <PublicShell>
    <div className="container" style={{padding:'32px 0',maxWidth:640}}>
      <h1 style={{color:'var(--navy)'}}>Payment Return</h1>
      <div className="card" style={{marginTop:16}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <strong>Checkout</strong>
          <span className={`badge ${state==='available'?'badge-verified':state==='paid_pending_vend'?'badge-stale':state==='failed'?'badge-offline':'badge-unknown'}`}>{state}</span>
        </div>
        <div style={{marginTop:12,padding:12,background:'var(--canvas)',borderRadius:8}}>
          <div style={{fontWeight:600}}>Reference: {ref}</div>
          <div style={{fontSize:13,color:'var(--muted)'}}>Quote → checkout → provider → webhook → vending → credit are distinct. Redirect not proof.</div>
        </div>
        <div style={{marginTop:16}}>
          {state==='pending' && <div><div className="skeleton" style={{height:16,width:'60%'}} /><div style={{fontSize:13,color:'var(--muted)',marginTop:8}}>Checkout pending — redirecting to provider…</div></div>}
          {state==='verifying' && <div><div className="skeleton" style={{height:16,width:'50%'}} /><div style={{fontSize:13,color:'var(--muted)',marginTop:8}}>Verifying — checking amount/currency/account with provider…</div></div>}
          {state==='paid_pending_vend' && <div style={{background:'#FFF4E5',padding:12,borderRadius:8}}>Payment received — vending pending. Reference {ref}. <strong>Do not pay again while we reconcile.</strong><div style={{fontSize:12,marginTop:8}}>Reserved units pending vendor confirmation; not yet usable physical supply.</div></div>}
          {state==='available' && <div style={{background:'#E6F4EA',padding:12,borderRadius:8,color:'var(--green)'}}><strong>✓ Confirmed</strong> — {ref} · 50 kWh credited. Room balance updated. Receipt issued.</div>}
          {state==='failed' && <div className="error-panel">Payment failed — no charge. <button className="btn btn-secondary">Retry</button></div>}
          {state==='unknown' && <div className="error-panel">Outcome unknown — querying by original operation ID/idempotency key. Never resubmit with fresh key.</div>}
        </div>
        <div style={{display:'flex',gap:8,marginTop:16,flexWrap:'wrap'}}>
          <a href="/billing" className="btn btn-primary">Billing</a>
          <a href="/dashboard/tenant" className="btn btn-secondary">Dashboard</a>
          <button onClick={()=>setState('unknown')} className="btn btn-secondary">Simulate unknown</button>
        </div>
        <div style={{fontSize:12,color:'var(--muted)',marginTop:12}}>Refresh polls status by Idempotency-Key, not another charge. Payment / vending / credit tracked separately.</div>
      </div>
    </div>
  </PublicShell>
}
