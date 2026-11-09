'use client'
import PublicShell from '@/components/PublicShell'
import { useState } from 'react'
import { API_BASE } from '@/lib/api'

export default function Page(){
  const [form,setForm]=useState({phone:'',password:'',full_name:'',role:'tenant'})
  const [state,setState]=useState<'idle'|'loading'|'success'|'error'|'forbidden'>('idle')
  const [msg,setMsg]=useState('')
  const [errors,setErrors]=useState<Record<string,string>>({})

  async function submit(e:React.FormEvent){
    e.preventDefault()
    const errs:Record<string,string>={}
    if (!form.phone.match(/^\+[1-9][0-9]{7,14}$/)) errs.phone='Phone must be E.164 e.g. +2348012345678'
    if (form.password.length<8) errs.password='Minimum 8 characters'
    if (!form.full_name) errs.full_name='Full name required'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setState('loading')
    try{
      const res=await fetch(`${API_BASE}/auth/signup`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)})
      const data=await res.json()
      if (!res.ok){
        if (res.status===403){ setState('forbidden'); setMsg(data.message) }
        else if (res.status===409){ setState('error'); setMsg('Phone already registered. Try logging in.') }
        else { setState('error'); setMsg(data.message||'Signup failed') }
        return
      }
      localStorage.setItem('smartclamp_token', data.access_token)
      localStorage.setItem('smartclamp_role', data.role)
      setState('success')
      setMsg('Account created. Redirecting to dashboard...')
      setTimeout(()=>location.href=`/dashboard/${data.role==='landlord'?'landlord':data.role==='homeowner'?'homeowner':'tenant'}`,800)
    }catch{
      setState('error'); setMsg('Cannot reach SmartClamp. Check connection and retry.')
    }
  }

  return <PublicShell>
    <div className="container" style={{padding:'32px 0',maxWidth:560}}>
      <h1 style={{color:'var(--navy)'}}>Create your account</h1>
      <p style={{color:'var(--muted)'}}>Role is intent, not authority. Privileged roles (installer, utility, internal) require invitation and verification.</p>
      <form onSubmit={submit} noValidate aria-label="Sign up" className="card" style={{marginTop:24,display:'grid',gap:16}}>
        <div>
          <label htmlFor="phone" style={{fontWeight:600}}>Phone (E.164)</label>
          <input id="phone" className="input" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="+2348012345678" inputMode="tel" aria-invalid={!!errors.phone} aria-describedby={errors.phone?'phone-err':undefined} />
          {errors.phone && <div id="phone-err" role="alert" style={{color:'var(--red)',fontSize:13}}>{errors.phone}</div>}
        </div>
        <div>
          <label htmlFor="full_name" style={{fontWeight:600}}>Full name</label>
          <input id="full_name" className="input" value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})} placeholder="Ada Lovelace" aria-invalid={!!errors.full_name} />
          {errors.full_name && <div role="alert" style={{color:'var(--red)',fontSize:13}}>{errors.full_name}</div>}
        </div>
        <div>
          <label htmlFor="password" style={{fontWeight:600}}>Password</label>
          <input id="password" type="password" className="input" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Min 8 characters" aria-invalid={!!errors.password} />
          {errors.password && <div role="alert" style={{color:'var(--red)',fontSize:13}}>{errors.password}</div>}
        </div>
        <div>
          <label htmlFor="role" style={{fontWeight:600}}>I am a…</label>
          <select id="role" className="input" value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>
            <option value="tenant">Tenant (room)</option>
            <option value="landlord">Landlord (building owner)</option>
            <option value="homeowner">Homeowner (single home)</option>
          </select>
          <div style={{fontSize:12,color:'var(--muted)',marginTop:4}}>Installer/agent/referrer/utility require admin invitation — you cannot self-promote.</div>
        </div>
        {state==='error' && <div className="error-panel" role="alert">{msg} <button type="button" onClick={()=>setState('idle')} className="btn btn-secondary" style={{marginLeft:8}}>Retry</button></div>}
        {state==='forbidden' && <div className="error-panel" role="alert">{msg}</div>}
        {state==='success' && <div style={{background:'#E6F4EA',padding:12,borderRadius:8,color:'var(--green)',fontWeight:600}}>{msg}</div>}
        <button type="submit" disabled={state==='loading'} className="btn btn-primary">{state==='loading'?'Creating…':'Create account'}</button>
        <div style={{fontSize:13,color:'var(--muted)'}}>By signing up you agree to <a href="/terms" style={{fontWeight:600}}>Terms</a> and <a href="/privacy" style={{fontWeight:600}}>Privacy</a>. Wallet and subscription are separate.</div>
        <div style={{textAlign:'center'}}>Already have an account? <a href="/login" style={{fontWeight:700}}>Log in</a></div>
      </form>
      {state==='loading' && <div aria-busy="true" style={{marginTop:16}}><div className="skeleton" style={{height:16,width:'50%'}} /></div>}
    </div>
  </PublicShell>
}
