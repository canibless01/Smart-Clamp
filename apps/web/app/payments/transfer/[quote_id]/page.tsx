'use client'
import AppShell from '@/components/AppShell'
import { useState, useEffect } from 'react'
import { API_BASE } from '@/lib/api'
export default function Page({params}:{params:{quote_id:string}}){
  const [data,setData]=useState<any>(null)
  useEffect(()=>{
    const token=localStorage.getItem('smartclamp_token')
    if (!token) return
    fetch(`${API_BASE}/payments/${params.quote_id}/transfer-instructions`,{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.json()).then(setData)
  },[params.quote_id])
  return <AppShell role="tenant">
    <h1 style={{color:'var(--navy)'}}>Bank Transfer Instructions</h1>
    <p style={{color:'var(--muted)'}}>Provider-generated — not static personal bank destination. Includes expiry + reference. Public payer uses scoped status token.</p>
    <div className="card" style={{marginTop:16,maxWidth:560}}>
      <div style={{display:'flex',justifyContent:'space-between'}}><strong>Quote {params.quote_id.slice(0,8)}</strong><span className="badge badge-stale">expires in 24h</span></div>
      <div style={{marginTop:12,background:'var(--canvas)',padding:16,borderRadius:12}}>
        <div style={{display:'flex',justifyContent:'space-between'}}><span>Bank</span><strong>{data?.bank_name||'SmartClamp Sandbox (Wema)'}</strong></div>
        <div style={{display:'flex',justifyContent:'space-between'}}><span>Account</span><strong style={{fontFamily:'monospace'}}>{data?.account_number||'0123456789'}</strong></div>
        <div style={{display:'flex',justifyContent:'space-between'}}><span>Amount</span><strong>₦5,000.00</strong></div>
        <div style={{display:'flex',justifyContent:'space-between'}}><span>Reference</span><strong style={{fontFamily:'monospace'}}>{data?.reference||'PS_'+params.quote_id.slice(0,8)}</strong></div>
        <div style={{display:'flex',justifyContent:'space-between'}}><span>Expires</span><span>{data?.expires_at||'2026-11-10T12:00:00Z'}</span></div>
      </div>
      <div style={{display:'flex',gap:8,marginTop:12}}>
        <button className="btn btn-primary">Copy details</button>
        <a href="/payments/return" className="btn btn-secondary">I've transferred</a>
        <button className="btn btn-secondary">Refresh status</button>
      </div>
      <div style={{fontSize:12,color:'var(--muted)',marginTop:8}}>Provider reference unique per gateway event. Return-to-ON clears only wallet_zero, not protection/manual.</div>
    </div>
  </AppShell>
}
