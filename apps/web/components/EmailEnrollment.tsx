"use client";
import {useState} from 'react';
import {apiFetch} from '@/lib/api';
import {storeSession} from '@/lib/session';
export default function EmailEnrollment(){
 const [email,setEmail]=useState(''),[code,setCode]=useState(''),[stage,setStage]=useState('email'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 return <section className="card" style={{marginTop:24}}><h2>Add a verified email</h2><p>Use an email you control for account notices and email sign-in. Log in again first if your sign-in is more than ten minutes old. Email notifications remain your choice after verification.</p>
 <form className="resource-form" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{const result=await apiFetch('/auth/email/'+(stage==='email'?'enroll':'verify'),{method:'POST',body:JSON.stringify({email,code})});if(result.status==='verified'){if(result.access_token)storeSession(result);location.reload();}else setStage('verify');}catch(e){setError(e instanceof Error?e.message:'Unable to verify your email.');}finally{setBusy(false);}}}>
 <label>Account email<input className="input" type="email" autoComplete="email" required maxLength={254} value={email} disabled={stage==='verify'} onChange={e=>setEmail(e.target.value)}/></label>
 {stage==='verify' && <label>Email verification code<input className="input" autoComplete="one-time-code" inputMode="numeric" required pattern="[0-9]{6,10}" value={code} onChange={e=>setCode(e.target.value)}/></label>}
 {error && <p role="alert">{error}</p>}
 <button className="btn btn-primary" disabled={busy}>{busy?'Please wait…':stage==='email'?'Send email verification code':'Verify email'}</button>
 {stage==='verify' && <button className="btn btn-secondary" type="button" disabled={busy} onClick={()=>{setStage('email');setCode('');setError('');}}>Use a different email</button>}
 </form></section>;
}
