"use client";
import { useState } from 'react';
import { apiFetch } from '@/lib/api';
export default function PhoneEnrollment() {
  const [phone,setPhone]=useState(''),[code,setCode]=useState(''),[stage,setStage]=useState('phone'),[busy,setBusy]=useState(false),[error,setError]=useState('');
  return <section className="card" style={{marginTop:24}}><h2>Add a verified phone</h2><p>Needed for meter purchases, SMS and phone confirmation before device control. Log in again first if your sign-in is more than ten minutes old.</p>
    <form className="resource-form" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try {
      await apiFetch('/auth/phone/'+(stage==='phone'?'enroll':'verify'),{method:'POST',body:JSON.stringify({phone,code})});
      if(stage==='phone')setStage('verify');else location.reload();
    }catch(e){setError(e instanceof Error?e.message:'Unable to verify your phone.');}finally{setBusy(false);}}}>
      <label>Security phone number<input className="input" autoComplete="tel" type="tel" required value={phone} disabled={stage==='verify'} onChange={e=>setPhone(e.target.value)} placeholder="+2348012345678"/></label>
      {stage==='verify' && <label>Phone verification code<input className="input" autoComplete="one-time-code" inputMode="numeric" required value={code} onChange={e=>setCode(e.target.value)}/></label>}
      {error && <p role="alert">{error}</p>}
      <button className="btn btn-primary" disabled={busy}>{busy?'Please wait…':stage==='phone'?'Send verification code':'Verify phone'}</button>
      {stage==='verify' && <button type="button" className="btn btn-secondary" onClick={()=>{setStage('phone');setCode('');}}>Use a different number</button>}
    </form>
  </section>;
}
