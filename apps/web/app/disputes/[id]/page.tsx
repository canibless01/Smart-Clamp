"use client";
import {useState} from "react";
import Link from "next/link";
import RecordWorkspace from "@/components/RecordWorkspace";
import {apiFetch,formatNaira} from "@/lib/api";
export default function Page({params:{id}}:{params:{id:string}}) {
  const [note,setNote]=useState(""),[message,setMessage]=useState(""),[action,setAction]=useState("claim"),[busy,setBusy]=useState(false),[error,setError]=useState("");
  return <RecordWorkspace title="Billing dispute" description="Review the saved bill, discussion and recorded decisions." endpoint={`/disputes/${id}/meeting-view`}>
    {(data,reload)=>{
      const closed=['resolved','closed_no_adjustment'].includes(data.status);
      async function send(path:string,payload:any){setBusy(true);setError("");try{await apiFetch(path,{method:'POST',body:JSON.stringify(payload)});setNote("");setMessage("");reload();}catch(e){setError(e instanceof Error?e.message:'Unable to save.');}finally{setBusy(false);}}
      return <div className="resource-list"><div className="resource-actions"><Link className="text-link" href="/disputes">All disputes</Link><Link className="text-link" href={`/disputes/${id}/meeting`}>Read-only meeting view</Link></div>
        <section className="card"><h2>Status: {data.status}</h2><p>{data.note}</p><p>Bill amount: {formatNaira(data.evidence_snapshot.amount_kobo)}</p><p>{data.evidence_snapshot.period_start} – {data.evidence_snapshot.period_end}</p><p>Review actions do not change a bill, wallet, or electricity supply.</p></section>
        <div className="resource-list">{data.messages.map((m:any,i:number)=><article className="card" key={i}><p>{m.message}</p><time>{new Date(m.created_at).toLocaleString()}</time></article>)}</div>
        {data.decisions.length>0 && <section className="card"><h2>Decision history</h2>{data.decisions.map((d:any,i:number)=><p key={i}>{d.decision.replaceAll('_',' ')} · {d.note}</p>)}</section>}
        {!closed && <form className="resource-form" onSubmit={e=>{e.preventDefault();void send(`/disputes/${id}/messages`,{message});}}><label>Reply<textarea className="input" required maxLength={4000} value={message} onChange={e=>setMessage(e.target.value)}/></label><button className="btn btn-primary" disabled={busy}>Send reply</button></form>}
        {data.status!=='resolved' && <form className="resource-form" onSubmit={e=>{e.preventDefault();void send(`/disputes/${id}/workflow`,{action:closed?'reopen':data.can_review?action:'escalate',note,version:data.version});}}>
          <h2>{closed?'Reopen dispute':'Case review'}</h2>
          {!closed && data.can_review && <label>Review action<select className="input" value={action} onChange={e=>setAction(e.target.value)}><option value="claim">Claim dispute</option><option value="respond">Record response</option><option value="escalate">Escalate</option><option value="close_no_adjustment">Close without adjustment</option></select></label>}
          {!closed && !data.can_review && <p>Request an escalation with your reason. No financial adjustment is applied by this action.</p>}
          <label>Review note<textarea className="input" required maxLength={4000} value={note} onChange={e=>setNote(e.target.value)}/></label><button className="btn btn-secondary" disabled={busy}>{closed?'Reopen dispute':data.can_review?'Save review':'Escalate dispute'}</button>
        </form>}
        {error && <p role="alert">{error}</p>}
      </div>;
    }}
  </RecordWorkspace>;
}
