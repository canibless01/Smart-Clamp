'use client'
import PublicShell from '@/components/PublicShell'
import { useState } from 'react'
import { API_BASE } from '@/lib/api'
export default function Page(){
  const [email,setEmail]=useState('')
  const [state,setState]=useState<'idle'|'loading'|'sent'>('idle')
  async function submit(e:any){
    e.preventDefault()
    setState('loading')
    await fetch(`${API_BASE}/auth/recovery`,{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':'rec-'+Date.now()},body:JSON.stringify({phone_or_email:email})})
    setState('sent')
  }
  return <PublicShell>
    <div className="container" style={{padding:'32px 0',maxWidth:480}}>
      <h1 style={{color:'var(--navy)'}}>Account Recovery</h1>
      <p style={{color:'var(--muted)'}}>Supported Supabase session/recovery — do not reveal account existence (generic confirmation even if not found).</p>
      <form onSubmit={submit} className="card" style={{marginTop:16,display:'grid',gap:12}}>
        <label style={{fontWeight:600}}>Phone or email<input className="input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="+2348012345678 or ada@email.com" /></label>
        {state==='loading' && <div aria-busy="true" className="skeleton" style={{height:16}} />}
        {state==='sent' && <div style={{background:'#E6F4EA',padding:12,borderRadius:8,color:'var(--green)'}}>If an account exists, a recovery link has been sent. Check inbox/SMS.</div>}
        {state!=='sent' && <button type="submit" className="btn btn-primary" disabled={state==='loading'}>{state==='loading'?'Sending…':'Send recovery link'}</button>}
        <a href="/login" style={{textAlign:'center',fontWeight:600}}>Back to log in</a>
      </form>
    </div>
  </PublicShell>
}
