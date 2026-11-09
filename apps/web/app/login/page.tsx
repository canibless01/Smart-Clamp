'use client'
import PublicShell from '@/components/PublicShell'
import { useState } from 'react'
import { API_BASE } from '@/lib/api'

export default function Page(){
  const [phone,setPhone]=useState('')
  const [password,setPassword]=useState('')
  const [state,setState]=useState<'idle'|'loading'|'error'>('idle')
  const [msg,setMsg]=useState('')

  async function submit(e:React.FormEvent){
    e.preventDefault()
    setState('loading')
    try{
      const res=await fetch(`${API_BASE}/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone,password})})
      const data=await res.json()
      if (!res.ok){ setState('error'); setMsg(data.message||'Invalid credentials — no account enumeration'); return }
      localStorage.setItem('smartclamp_token', data.access_token)
      localStorage.setItem('smartclamp_role', data.role)
      location.href=`/dashboard/${data.role==='landlord'?'landlord':data.role==='homeowner'?'homeowner':data.role==='tenant'?'tenant':data.role==='nepa_staff'?'utility':data.role.startsWith('internal')?'../ops':'tenant'}`
    }catch{
      setState('error'); setMsg('Cannot reach SmartClamp. Check connection.')
    }
  }

  return <PublicShell>
    <div className="container" style={{padding:'32px 0',maxWidth:520}}>
      <h1 style={{color:'var(--navy)'}}>Log in</h1>
      <form onSubmit={submit} className="card" style={{marginTop:24,display:'grid',gap:16}}>
        <div>
          <label htmlFor="phone" style={{fontWeight:600}}>Phone</label>
          <input id="phone" className="input" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+2348012345678" />
        </div>
        <div>
          <label htmlFor="pwd" style={{fontWeight:600}}>Password</label>
          <input id="pwd" type="password" className="input" value={password} onChange={e=>setPassword(e.target.value)} />
        </div>
        {state==='error' && <div className="error-panel" role="alert">{msg}</div>}
        <button type="submit" disabled={state==='loading'} className="btn btn-primary">{state==='loading'?'Signing in…':'Log in'}</button>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:13}}>
          <a href="/account/recovery" style={{fontWeight:600}}>Forgot password?</a>
          <a href="/signup" style={{fontWeight:600}}>Create account</a>
        </div>
      </form>
      {state==='loading' && <div aria-busy="true" className="skeleton" style={{height:16,width:'40%',marginTop:16}} />}
    </div>
  </PublicShell>
}
