"use client";
import {useState} from 'react';
import RecordWorkspace,{RecordTable} from '@/components/RecordWorkspace';
import {apiFetch} from '@/lib/api';
function Composer({data,reload,onCommitted}:{data:any;reload:()=>void;onCommitted:(message:string)=>void}){
  const [organization,setOrganization]=useState(''),[selected,setSelected]=useState<string[]>([]),[title,setTitle]=useState(''),[message,setMessage]=useState(''),[push,setPush]=useState(false),[sms,setSms]=useState(false),[preview,setPreview]=useState<any>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[result,setResult]=useState('');
  const [grantOrg,setGrantOrg]=useState(''),[grantNote,setGrantNote]=useState(''),[grantDays,setGrantDays]=useState(30),[grantEnabled,setGrantEnabled]=useState(false);
  const devices=(data.devices||[]).filter((device:any)=>!data.utility || device.organization_ids.includes(organization));
  const changed=()=>{setPreview(null);setResult('');onCommitted('');setError('');};
  return <>
    <section className="card"><h2>Prepare a service notice</h2><p>Select specific devices and preview the current account audience. In-app records are committed once; optional SMS and browser push respect recipient preferences. Provider acceptance does not prove display or reading.</p>
      {data.utility && !data.organizations.length && <p>No reviewed utility messaging grant is active. Organization membership alone does not authorize customer broadcasts.</p>}
      <form className="resource-form" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');setResult('');try{
        const p=await apiFetch('/communications/previews',{method:'POST',body:JSON.stringify({title,message,device_ids:selected,organization_id:organization||undefined,channels:['in_app',...(push?['push']:[]),...(sms?['sms']:[])]})});setPreview(p);
      }catch(e){setPreview(null);setError(e instanceof Error?e.message:'Unable to preview this notice.');}finally{setBusy(false);}}}>
        {data.utility && <label>Reviewed utility organization<select className="input" required value={organization} onChange={e=>{setOrganization(e.target.value);setSelected([]);changed();}}><option value="">Choose an organization</option>{data.organizations.map((o:any)=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>}
        <fieldset><legend>Devices in the audience</legend><p>Choose up to 50. No private customer contact list is exposed.</p><div className="notice-device-list">{devices.map((device:any)=><label key={device.id}><input type="checkbox" checked={selected.includes(device.id)} disabled={!selected.includes(device.id) && selected.length>=50} onChange={e=>{setSelected(e.target.checked?[...selected,device.id]:selected.filter(id=>id!==device.id));changed();}}/><span>{device.profile.replace(/_/g,' ')} · {device.id}</span></label>)}</div><p>{selected.length} selected</p></fieldset>
        <label>Notice title<input className="input" required maxLength={120} value={title} onChange={e=>{setTitle(e.target.value);changed();}}/></label>
        <label>Service message<textarea className="input" required minLength={10} maxLength={2000} rows={5} value={message} onChange={e=>{setMessage(e.target.value);changed();}}/></label>
        <p>In-app notice included. {data.utility?'Only current device accounts that opted into utility notices are eligible.':''}</p>
        <label><input type="checkbox" checked={push} disabled={!data.channels.push} onChange={e=>{setPush(e.target.checked);changed();}}/> Include browser push for opted-in devices {data.channels.push?'':'(not configured)'}</label>
        <label><input type="checkbox" checked={sms} disabled={!data.channels.sms} onChange={e=>{setSms(e.target.checked);changed();}}/> Include SMS for opted-in phones; provider charges may apply {data.channels.sms?'':'(not configured)'}</label>
        <button className="btn btn-secondary" disabled={busy || !selected.length}>{busy?'Please wait…':'Preview current audience'}</button>
      </form>
      {error && <p role="alert">{error}</p>}
    </section>
    {preview && <section className="card" style={{marginTop:24}}><h2>Review before sending</h2><h3>{preview.title}</h3><p style={{whiteSpace:'pre-wrap'}}>{preview.message}</p><p>{preview.in_app_recipients} in-app recipients · {preview.push_subscriptions} browser subscriptions · {preview.sms_recipients} SMS recipients</p><p>Preview expires {new Date(preview.expires_at).toLocaleTimeString()}. Changes to occupancy, scope or utility opt-in require another preview.</p><button className="btn btn-primary" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{
      const sent=await apiFetch('/communications/send',{method:'POST',body:JSON.stringify({preview_id:preview.id})});onCommitted(`${sent.recipient_count} in-app notices committed. Optional channel dispatch is queued, not confirmed delivered.`);setPreview(null);reload();
    }catch(e){setError(e instanceof Error?e.message:'Unable to commit this notice.');}finally{setBusy(false);}}}>Commit notice to this audience</button></section>}
    {result && <p role="status">{result}</p>}
    <section className="card" style={{marginTop:24}}><h2>Your committed notices</h2><RecordTable items={data.history} columns={[{key:'title',label:'Notice'},{key:'recipient_count',label:'In-app recipients'},{key:'created_at',label:'Committed at'}]}/></section>
    <section className="card" style={{marginTop:24}}><h2>Sending software to an ESP</h2><p>Browser messages do not execute device code. Engineering uses signed firmware artifacts, a compatible-device canary and boot/rollback receipts.</p>{data.firmware_access && <a className="text-link" href="/ops/firmware">Open engineering firmware updates</a>}</section>
    {data.can_review_grants && <section className="card" style={{marginTop:24}}><h2>Reviewed utility messaging authority</h2><p>Only enable after reviewing the organization's contract, purpose and assigned-device scope. This grant does not authorize control, electricity resale or access to customer identity.</p><RecordTable items={data.notice_grants} columns={[{key:'organization_id',label:'Organization reference'},{key:'name',label:'Name'},{key:'enabled',label:'Enabled'},{key:'expires_at',label:'Expiry'},{key:'version',label:'Version'}]}/>
      <form className="resource-form" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{
        const old=data.notice_grants.find((grant:any)=>grant.organization_id===grantOrg);
        await apiFetch(`/ops/organizations/${grantOrg}/notice-grant`,{method:'POST',body:JSON.stringify({enabled:grantEnabled,valid_days:grantDays,review_note:grantNote,expected_version:old?.version})});setGrantNote('');reload();
      }catch(e){setError(e instanceof Error?e.message:'Unable to save reviewed authority.');}finally{setBusy(false);}}}>
        <label>Organization reference<input className="input" required value={grantOrg} onChange={e=>setGrantOrg(e.target.value)}/></label><label>Review and authority notes<textarea className="input" required minLength={10} maxLength={2000} value={grantNote} onChange={e=>setGrantNote(e.target.value)}/></label><label>Valid days<input className="input" required type="number" min={1} max={365} value={grantDays} onChange={e=>setGrantDays(Number(e.target.value))}/></label><label><input type="checkbox" checked={grantEnabled} onChange={e=>setGrantEnabled(e.target.checked)}/> Enable reviewed messaging authority</label><button className="btn btn-secondary" disabled={busy}>Save reviewed authority</button>
      </form>
    </section>}
  </>;
}
export default function Page(){const [committed,setCommitted]=useState('');return <RecordWorkspace title="Service messages" description="Scoped account communication, with audience review and committed delivery records." endpoint="/communications/context">{(data,reload)=><>{committed && <p role="status">{committed}</p>}<Composer data={data} reload={reload} onCommitted={setCommitted}/></>}</RecordWorkspace>;}
