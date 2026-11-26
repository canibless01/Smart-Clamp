"use client";
import {createContext,useContext,useEffect,useState,useRef,type ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import {API_BASE} from '@/lib/api';
import {getAccessToken,hasSession,subject,clearSession,refreshSession,tokenNeedsRefresh} from '@/lib/session';
type Snapshot={context:any;notifications:any[]};
type LiveState={snapshot:Snapshot|null;connection:'idle'|'connecting'|'synced'|'reconnecting';lastSynced:string|null};
const Context=createContext<LiveState>({snapshot:null,connection:'idle',lastSynced:null});
export function useWorkspaceLive(){return useContext(Context);}
export default function WorkspaceLiveProvider({children}:{children:ReactNode}){
 const path=usePathname(),workspace=/^\/(dashboard|history|billing|alerts|control|settings|reports|devices|meters|ops|communications|portal|orders|disputes|admin|support\/(tickets|requests))(\/|$)/.test(path);
 const identity=useRef<string|null>(null);
 const [state,setState]=useState<LiveState>({snapshot:null,connection:'idle',lastSynced:null}),[revision,setRevision]=useState(0);
 useEffect(()=>{const changed=()=>setRevision(value=>value+1);window.addEventListener('smartclamp:session-updated',changed);window.addEventListener('smartclamp:session-ended',changed);return()=>{window.removeEventListener('smartclamp:session-updated',changed);window.removeEventListener('smartclamp:session-ended',changed);};},[]);
 useEffect(()=>{
  if(!workspace||!hasSession()){setState({snapshot:null,connection:'idle',lastSynced:null});return;}
  const currentIdentity=subject(getAccessToken())||getAccessToken();if(identity.current!==currentIdentity){identity.current=currentIdentity;setState({snapshot:null,connection:'connecting',lastSynced:null});}
  let stopped=false,delay=1000,retry:ReturnType<typeof setTimeout>|null=null;const controller=new AbortController();
  async function connect(){
   if(stopped)return;
   setState(previous=>({...previous,connection:previous.snapshot?'reconnecting':'connecting'}));
   try{
    if(localStorage.getItem('smartclamp_refresh_token')&&tokenNeedsRefresh()){const refreshed=await refreshSession(API_BASE);if(refreshed==='invalid'){clearSession();return;}if(refreshed!=='refreshed')throw new Error('Session cannot be refreshed yet');}
    const token=getAccessToken();if(!token)throw new Error('No session');
    const response=await fetch(API_BASE+'/users/me/live',{headers:{Authorization:'Bearer '+token,Accept:'text/event-stream'},signal:controller.signal,cache:'no-store'});
    if(response.status===401){const refreshed=await refreshSession(API_BASE);if(refreshed==='invalid'){clearSession();return;}throw new Error('Live session revalidating');}
    if(!response.ok||!response.headers.get('content-type')?.includes('text/event-stream')||!response.body)throw new Error('Live connection unavailable');
    const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';
    try{while(!stopped){const chunk=await reader.read();if(chunk.done)break;buffer+=decoder.decode(chunk.value,{stream:true});if(buffer.length>2000000)throw new Error('Live frame exceeds limit');let boundary;
     while((boundary=buffer.indexOf('\n\n'))>=0){const frame=buffer.slice(0,boundary);buffer=buffer.slice(boundary+2);if(frame.startsWith('event: reauthenticate')){window.dispatchEvent(new Event('smartclamp:session-updated'));throw new Error('Session needs revalidation');}if(!frame.startsWith('event: snapshot'))continue;const line=frame.split('\n').find(value=>value.startsWith('data: '));if(!line)continue;const snapshot=JSON.parse(line.slice(6));if(!snapshot.context?.authorized_context||!Array.isArray(snapshot.notifications))throw new Error('Invalid snapshot');if(!stopped){delay=1000;setState({snapshot,connection:'synced',lastSynced:new Date().toISOString()});}}
    }}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
   }catch{if(!stopped)setState(previous=>({...previous,connection:'reconnecting'}));}
   if(!stopped){retry=setTimeout(()=>void connect(),delay);delay=Math.min(delay*2,30000);}
  }
  void connect();return()=>{stopped=true;controller.abort();if(retry)clearTimeout(retry);};
 },[workspace,revision]);
 return <Context.Provider value={state}>{children}</Context.Provider>;
}
