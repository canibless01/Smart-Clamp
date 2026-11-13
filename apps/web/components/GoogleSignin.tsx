"use client";
import { useState } from 'react';
import { apiFetch } from '@/lib/api';
export default function GoogleSignin({enabled,role,next}:{enabled:boolean;role:string;next:string}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  return <div className="auth-google">
    <button type="button" className="btn btn-secondary" disabled={!enabled || busy} onClick={async()=>{
      setBusy(true);setError('');
      try {
        const random=(n:number)=>Array.from(crypto.getRandomValues(new Uint8Array(n)),b=>b.toString(16).padStart(2,'0')).join('');
        const verifier=random(32),flow=random(32);
        const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));
        const challenge=btoa(String.fromCharCode(...Array.from(new Uint8Array(digest)))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
        sessionStorage.setItem('smartclamp_google',JSON.stringify({verifier,flow,role,next,created:Date.now()}));
        const result=await apiFetch('/auth/oauth/start',{method:'POST',body:JSON.stringify({code_challenge:challenge,flow_id:flow})});
        location.assign(result.url);
      } catch(e) { sessionStorage.removeItem('smartclamp_google');setError(e instanceof Error?e.message:'Unable to start Google sign-in.');setBusy(false); }
    }}>{busy?'Connecting…':'Continue with Google'}</button>
    {!enabled && <p className="auth-fineprint">Google sign-in is awaiting provider configuration.</p>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
