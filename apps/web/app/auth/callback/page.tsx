"use client";
import { useEffect,useRef,useState } from 'react';
import PublicShell from '@/components/PublicShell';
import { apiFetch } from '@/lib/api';
import { finishSignin } from '@/lib/signin';
export default function Page() {
  const started=useRef(false),[error,setError]=useState('');
  useEffect(()=>{if(started.current)return;started.current=true;
    void(async()=>{try {
      const params=new URLSearchParams(location.search),raw=sessionStorage.getItem('smartclamp_google');
      history.replaceState(null,'','/auth/callback');
      if(!raw)throw new Error('This sign-in request has expired. Start again from Log in.');
      const flow=JSON.parse(raw);sessionStorage.removeItem('smartclamp_google');
      if(params.get('error') || !params.get('code') || flow.flow!==params.get('flow_id') || Date.now()-flow.created>600000 || Date.now()<flow.created)throw new Error('Google sign-in was cancelled or expired. Please try again.');
      const result=await apiFetch('/auth/oauth/exchange',{method:'POST',body:JSON.stringify({code:params.get('code'),code_verifier:flow.verifier})});
      sessionStorage.setItem('smartclamp_signup_role',flow.role);
      finishSignin(result,flow.next);
    }catch(e){setError(e instanceof Error?e.message:'Unable to complete sign-in.');}})();
  },[]);
  return <PublicShell><div className="container marketing-page" style={{maxWidth:600}}><h1>Completing your sign-in</h1>{error?<><p role="alert">{error}</p><a className="btn btn-primary" href="/login">Return to Log in</a></>:<p role="status">Verifying your Google sign-in…</p>}</div></PublicShell>;
}
