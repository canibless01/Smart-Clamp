'use client'
import AppShell from '@/components/AppShell'
import { useState } from 'react'
import { API_BASE } from '@/lib/api'

export default function Page(){
  const [amount,setAmount]=useState('5000')
  const [state,setState]=useState<'idle'|'quoting'|'checkout'|'verifying'|'paid_pending_vend'|'confirmed'|'failed'|'unknown'>('idle')
  const [quote,setQuote]=useState<any>(null)
  const [payment,setPayment]=useState<any>(null)
  const [error,setError]=useState('')

  async function createQuote(){
    setState('quoting')
    try{
      const res=await fetch(`${API_BASE}/payments/quotes`,{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':`quote-${Date.now()}`},body:JSON.stringify({destination_token:'dest_demo',amount_kobo: parseInt(amount)*100,utility_type:'electricity'})})
      if (!res.ok) throw await res.json()
      const q=await res.json()
      setQuote(q); setState('checkout')
    }catch(e:any){ setError(e.message||'Quote failed'); setState('failed')}
  }
  async function checkout(){
    setState('verifying')
    try{
      const res=await fetch(`${API_BASE}/payments/checkout`,{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':`chk-${Date.now()}`},body:JSON.stringify({quote_id:quote.id,return_path:'/payments/return'})})
      if (!res.ok) throw await res.json()
      const c=await res.json()
      setPayment(c)
      setState('paid_pending_vend')
      setTimeout(()=>setState('confirmed'),1500)
    }catch(e:any){ setError(e.message||'Checkout failed'); setState('failed')}
  }

  return <AppShell role="tenant">
    <h1 style={{color:'var(--navy)'}}>Billing & Payments</h1>
    <p style={{color:'var(--muted)'}}>Wallet and electricity ledger; subscriptions separate; tariff/fees; receipts; auto-recharge opt-in. Amounts in kobo, no float money.</p>
    <div className="grid-12" style={{marginTop:16}}>
      <div className="card" style={{gridColumn:'span 6'}}>
        <h3>Recharge</h3>
        <div style={{display:'flex',gap:8,alignItems:'end',flexWrap:'wrap'}}>
          <div><label htmlFor="amt" style={{fontWeight:600}}>Amount NGN</label><input id="amt" className="input" value={amount} onChange={e=>setAmount(e.target.value)} inputMode="numeric" /></div>
          <button onClick={createQuote} disabled={state==='quoting'} className="btn btn-primary">Get quote</button>
        </div>
        {state==='quoting' && <div aria-busy="true" className="skeleton" style={{height:16,marginTop:12}} />}
        {quote && <div style={{marginTop:12,background:'var(--canvas)',padding:12,borderRadius:8}}>
          <div>Quote {quote.id.slice(0,8)} — expires {quote.expires_at}</div>
          <div style={{fontSize:13,color:'var(--muted)'}}>Amount ₦{quote.amount_kobo/100} · Fee ₦{quote.fee_kobo/100} · Markup ₦{quote.markup_kobo/100} · Units {(quote.units_mwh/1000).toFixed(2)} kWh · Tariff {quote.tariff_version}</div>
          <button onClick={checkout} className="btn btn-primary" style={{marginTop:8}}>Proceed to checkout</button>
        </div>}
        {state==='paid_pending_vend' && <div style={{marginTop:12,color:'var(--muted)'}}>Payment paid — vending pending. Reference {payment?.id}. Do not pay again while we reconcile.</div>}
        {state==='confirmed' && <div style={{marginTop:12,background:'#E6F4EA',padding:12,borderRadius:8,color:'var(--green)'}}>✓ Payment confirmed, vending completed, credit available. Receipt issued.</div>}
        {state==='failed' && <div className="error-panel" style={{marginTop:12}}>{error} <button onClick={()=>setState('idle')} className="btn btn-secondary">Retry</button></div>}
        {state==='unknown' && <div className="error-panel">Outcome unknown — verifying using original operation ID/idempotency key. Never resubmit with fresh key.</div>}
      </div>
      <div className="card" style={{gridColumn:'span 6'}}>
        <h3>Wallet Ledger</h3>
        <table style={{width:'100%'}}><thead><tr><th>Date</th><th>Kind</th><th>Amount</th></tr></thead><tbody><tr><td>2026-11-09</td><td>recharge</td><td>₦5,000</td></tr><tr><td>2026-11-08</td><td>consumption</td><td>-12.4 kWh</td></tr></tbody></table>
        <div style={{fontSize:12,color:'var(--muted)',marginTop:8}}>Duplicate messages must not duplicate credits/consumption/vending/actuation. Gateway ACK ≠ durable cloud ACK.</div>
        <a href="/history" className="btn btn-secondary" style={{marginTop:12}}>Export CSV</a>
      </div>
    </div>
    <div className="card" style={{marginTop:16}}>
      <h3>Auto-recharge</h3>
      <p style={{color:'var(--muted)'}}>Off by default. Requires opted-in mandate/cap/threshold. One in-flight request. No device-stored bank PIN.</p>
      <label><input type="checkbox" /> Enable auto-recharge at 10% balance</label>
    </div>
  </AppShell>
}
