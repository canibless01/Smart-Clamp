import {apiFetch,API_BASE} from './api';
import {getAccessToken,subject} from './session';
let sdkPromise:Promise<any>|null=null;
let active:any=null;
let initializedApp='';
let sessionGeneration=0;
function sdk(appId:string):Promise<any>{
  if(sdkPromise){if(initializedApp!==appId)throw new Error('OneSignal application changed. Reload the page.');return sdkPromise;}
  initializedApp=appId;
  sdkPromise=new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('OneSignal could not load. Check your connection and retry.')),15000);
    const scope=window as any;scope.OneSignalDeferred=scope.OneSignalDeferred||[];
    scope.OneSignalDeferred.push(async(OneSignal:any)=>{try{
      await OneSignal.init({appId,serviceWorkerPath:'push/onesignal/OneSignalSDKWorker.js',serviceWorkerParam:{scope:'/push/onesignal/'},autoResubscribe:false,notifyButton:{enable:false},welcomeNotification:{disable:true},promptOptions:{slidedown:{prompts:[{type:'push',autoPrompt:false}]}}});
      clearTimeout(timer);resolve(OneSignal);
    }catch(e){clearTimeout(timer);reject(e);}});
    const script=document.createElement('script');script.src='https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';script.async=true;script.onerror=()=>{clearTimeout(timer);reject(new Error('Unable to load OneSignal.'));};document.head.appendChild(script);
  });
  return sdkPromise;
}
export async function onesignalSession(appId:string,activate=true){
  const generation=sessionGeneration;
  const uid=subject(getAccessToken());if(!uid)throw new Error('Log in before enabling notifications.');
  const key=`smartclamp_onesignal_device:${appId}:${uid}`;
  const saved=localStorage.getItem(key);
  const session=await apiFetch('/users/me/onesignal/session',{method:'POST',body:JSON.stringify(saved?{registration_id:saved}:{})});
  localStorage.setItem(key,session.registration_id);
  localStorage.setItem('smartclamp_onesignal_current',JSON.stringify({user_id:uid,registration_id:session.registration_id,app_id:appId}));
  if(!activate && !session.enabled)return {OneSignal:null,session};
  const OneSignal=await sdk(appId);
  if(generation!==sessionGeneration || subject(getAccessToken())!==uid)throw new Error('Your sign-in changed. Open Settings again.');
  active={OneSignal,session};await OneSignal.login(session.external_alias);
  if(generation!==sessionGeneration || subject(getAccessToken())!==uid){await OneSignal.User.PushSubscription.optOut();await OneSignal.logout();throw new Error('Your sign-in ended during notification setup.');}
  if(!session.enabled)await OneSignal.User.PushSubscription.optOut();
  active={OneSignal,session};return active;
}
export async function setOneSignalEnabled(enabled:boolean){
  if(!active)throw new Error('Browser notification setup is not ready.');
  const {OneSignal,session}=active;
  if(enabled){
    // Request permission directly from the second user gesture, before network work.
    await OneSignal.Notifications.requestPermission();
    // Remove legacy native subscription on this browser before opting into the
    // selected provider. Server dispatch never queues both providers for an event.
    const root=await navigator.serviceWorker.getRegistration('/');const prior=await root?.pushManager.getSubscription();
    if(prior){await apiFetch('/users/me/push-subscriptions',{method:'DELETE',body:JSON.stringify({endpoint:prior.endpoint})});await prior.unsubscribe();}
    await OneSignal.User.PushSubscription.optIn();
    if(!OneSignal.User.PushSubscription.optedIn){
      await new Promise<void>((resolve,reject)=>{
        const changed=()=>{if(OneSignal.User.PushSubscription.optedIn){clearTimeout(timer);OneSignal.User.PushSubscription.removeEventListener('change',changed);resolve();}};
        const timer=setTimeout(()=>{OneSignal.User.PushSubscription.removeEventListener('change',changed);reject(new Error('The browser did not confirm a push subscription.'));},15000);
        OneSignal.User.PushSubscription.addEventListener('change',changed);changed();
      });
    }
  }else await OneSignal.User.PushSubscription.optOut();
  try{await apiFetch(`/users/me/onesignal/devices/${session.registration_id}`,{method:'POST',body:JSON.stringify({enabled})});session.enabled=enabled;}
  catch(e){if(enabled)await OneSignal.User.PushSubscription.optOut();throw e;}
}
export async function stopOneSignalOnLogout(){
  sessionGeneration++;
  try{
    const saved=JSON.parse(localStorage.getItem('smartclamp_onesignal_current')||'null');
    if(saved && saved.user_id===subject(getAccessToken()))await fetch(`${API_BASE}/users/me/onesignal/devices/${saved.registration_id}`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getAccessToken()}`},body:JSON.stringify({enabled:false}),signal:AbortSignal.timeout(2000)}).catch(()=>{});
    if(active){const ending=active;active=null;await Promise.race([(async()=>{try{await ending.OneSignal.User.PushSubscription.optOut();}finally{await ending.OneSignal.logout();}})().catch(()=>{}),new Promise(resolve=>setTimeout(resolve,2000))]);}
    const registration=await navigator.serviceWorker?.getRegistration('/push/onesignal/');
    await (await registration?.pushManager.getSubscription())?.unsubscribe();
  }finally{localStorage.removeItem('smartclamp_onesignal_current');}
}
