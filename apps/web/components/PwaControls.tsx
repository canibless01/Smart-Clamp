"use client";
import { useEffect,useState } from 'react';
import { apiFetch } from '@/lib/api';
export default function PwaControls(){
  const [install,setInstall]=useState(false),[installed,setInstalled]=useState(false),[update,setUpdate]=useState<ServiceWorker|null>(null),[push,setPush]=useState<any>(null),[enabled,setEnabled]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[supported,setSupported]=useState(false);
  useEffect(()=>{
    const sync=()=>{setInstall(!!(window as any).smartclampInstallPrompt);setInstalled(matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone===true);};sync();window.addEventListener('smartclamp:pwa-ready',sync);window.addEventListener('appinstalled',sync);
    setSupported('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window);
    void apiFetch('/users/me/push-subscriptions').then(setPush).catch(()=>{});
    if('serviceWorker' in navigator)void navigator.serviceWorker.getRegistration('/').then(async registration=>{
      if(!registration)return;setUpdate(registration.waiting);setEnabled(!!await registration.pushManager.getSubscription());
      registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed' && navigator.serviceWorker.controller)setUpdate(registration.waiting);});});
    });
    return()=>{window.removeEventListener('smartclamp:pwa-ready',sync);window.removeEventListener('appinstalled',sync);};
  },[]);
  return <section className="card" style={{marginTop:24}}><h2>SmartClamp on this device</h2>
    <p>{installed?'You’re using the installed app.':'Install SmartClamp for quick access. In Safari, use Share → Add to Home Screen; in Chrome or Edge, use Install app in the browser menu.'}</p>
    <div className="resource-actions">
      {install && !installed && <button className="btn btn-secondary" onClick={async()=>{const prompt=(window as any).smartclampInstallPrompt;if(!prompt)return;await prompt.prompt();await prompt.userChoice;(window as any).smartclampInstallPrompt=null;setInstall(false);}}>Install SmartClamp</button>}
      {update && <button className="btn btn-secondary" onClick={()=>{navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload(),{once:true});update.postMessage({type:'ACTIVATE_UPDATE'});}}>Update installed app</button>}
    </div>
    <h3 style={{marginTop:24}}>Browser notifications</h3>
    <p>Optional private account alerts on this device. Lock-screen messages contain no readings or payment details. In-app notifications remain available.</p>
    {!supported?<p>This browser does not currently support Web Push. On iPhone/iPad, install the app first and open it from the Home Screen.</p>:!push?.available?<p>Web Push is awaiting operator configuration.</p>:<button className="btn btn-secondary" disabled={busy} onClick={async()=>{
      setBusy(true);setMessage('');let created:PushSubscription|null=null;
      try {
        const registration=await navigator.serviceWorker.ready;
        const prior=await registration.pushManager.getSubscription();
        if(enabled && prior){await apiFetch('/users/me/push-subscriptions',{method:'DELETE',body:JSON.stringify({endpoint:prior.endpoint})});await prior.unsubscribe();setEnabled(false);setMessage('Notifications disabled on this device.');}
        else {
          const key=push.vapid_public_key.replace(/-/g,'+').replace(/_/g,'/');const raw=atob(key+'='.repeat((4-key.length%4)%4));
          created=prior || await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:Uint8Array.from(raw,(c:string)=>c.charCodeAt(0))});
          await apiFetch('/users/me/push-subscriptions',{method:'POST',body:JSON.stringify(created.toJSON())});setEnabled(true);setMessage('Notifications enabled on this device.');
        }
      }catch(e){if(created)await created.unsubscribe().catch(()=>{});setMessage(e instanceof Error?e.message:'Unable to update browser notifications.');}
      finally{setBusy(false);}
    }}>{busy?'Please wait…':enabled?'Disable notifications on this device':'Enable notifications on this device'}</button>}
    {message && <p role="status">{message}</p>}
  </section>;
}
