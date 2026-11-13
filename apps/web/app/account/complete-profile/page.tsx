"use client";
import { useEffect,useState } from 'react';
import PublicShell from '@/components/PublicShell';
import { apiFetch } from '@/lib/api';
import { roleHome,safeReturnPath,hasSession } from '@/lib/session';
export default function Page() {
  const [data,setData]=useState<any>(null),[name,setName]=useState(''),[role,setRole]=useState('homeowner'),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function load(){setError('');try {const d=await apiFetch('/auth/onboarding');setData(d);setName(d.full_name||'');const intended=sessionStorage.getItem('smartclamp_signup_role');setRole(d.role || (['homeowner','tenant','landlord'].includes(intended||'')?intended:'homeowner')!);}catch(e){setError(e instanceof Error?e.message:'Unable to load your profile.');}}
  useEffect(()=>{if(!hasSession()){location.replace('/login');return;}void load();},[]);
  return <PublicShell><div className="container marketing-page" style={{maxWidth:600}}><span className="eyebrow">ONE LAST STEP</span><h1>Make yourself at home.</h1><p>Confirm your name and setup. We’ll ask for a property address when you add a building or arrange an installation.</p>
    {error && <p role="alert">{error}</p>}
    {!data?<button className="btn btn-secondary" onClick={()=>void load()}>Retry profile</button>:<form className="resource-form" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try {
      const result=await apiFetch('/auth/onboarding',{method:'POST',body:JSON.stringify({full_name:name,role,accepted_terms:consent,terms_version:data.terms_version,privacy_version:data.privacy_version})});
      sessionStorage.removeItem('smartclamp_signup_role');location.assign(safeReturnPath(new URLSearchParams(location.search).get('next'),roleHome[result.role]));
    }catch(e){setError(e instanceof Error?e.message:'Unable to save your profile.');}finally{setBusy(false);}}}>
      <p>Verified contact: {data.email || data.phone || 'Verification required'}</p>
      <label>Full name<input className="input" autoComplete="name" required maxLength={160} value={name} onChange={e=>setName(e.target.value)}/></label>
      {!data.role && <label>Your setup<select className="input" value={role} onChange={e=>setRole(e.target.value)}><option value="homeowner">My home</option><option value="tenant">My room</option><option value="landlord">My building</option></select></label>}
      <label className="consent-check"><input type="checkbox" required checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>I agree to the <a className="text-link" href="/terms" target="_blank" rel="noreferrer">Terms</a> and acknowledge the <a className="text-link" href="/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>.</span></label>
      <button className="btn btn-primary" disabled={busy || !consent}>{busy?'Saving…':'Complete my profile'}</button>
    </form>}
  </div></PublicShell>;
}
