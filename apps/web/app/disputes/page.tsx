"use client";
import {useEffect,useState} from "react";
import RecordWorkspace,{RecordTable} from "@/components/RecordWorkspace";
import {apiFetch,formatNaira} from "@/lib/api";
function NewDispute({reload}:{reload:()=>void}){
 const [bills,setBills]=useState<any[]>([]),[bill,setBill]=useState(""),[note,setNote]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 useEffect(()=>{apiFetch('/bills').then(d=>setBills(d.items)).catch(e=>setError(e instanceof Error?e.message:'Unable to load bills.'));},[]);
 return <form className="resource-form" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{await apiFetch('/disputes',{method:'POST',body:JSON.stringify({bill_id:bill,note})});setNote('');reload();}catch(e){setError(e instanceof Error?e.message:'Unable to open dispute.');}finally{setBusy(false);}}}>
 <h2>Dispute an issued bill</h2>{bills.length ? <><label>Bill<select className="input" required value={bill} onChange={e=>setBill(e.target.value)}><option value="">Choose an issued bill</option>{bills.map(b=><option key={b.id} value={b.id}>{b.period_start} – {b.period_end} · {formatNaira(b.amount_kobo)} · {b.id.slice(0,8)}</option>)}</select></label><label>Billing concern<textarea className="input" required maxLength={4000} value={note} onChange={e=>setNote(e.target.value)}/></label><button className="btn btn-primary" disabled={busy}>Open dispute</button></> : <p>No eligible issued bills are available. Contact support if a bill is missing.</p>}{error && <p role="alert">{error}</p>}</form>;
}
export default function Page(){const [offset,setOffset]=useState(0);return <RecordWorkspace title="Billing disputes" description="Issued bills, private discussion and recorded review decisions." endpoint={`/disputes?offset=${offset}`}>
 {(data,reload)=><div className="resource-list"><RecordTable items={data.items} columns={[{key:'id',label:'Dispute',render:r=><a className="text-link" href={`/disputes/${r.id}`}>{r.id.slice(0,8)}</a>},{key:'status',label:'Status'},{key:'created_at',label:'Opened',render:r=>new Date(r.created_at).toLocaleString()}]}/><div className="resource-actions">{offset>0 && <button className="btn btn-secondary" onClick={()=>setOffset(Math.max(0,offset-50))}>Previous disputes</button>}{data.next_cursor && <button className="btn btn-secondary" onClick={()=>setOffset(Number(data.next_cursor))}>More disputes</button>}</div>{!data.can_review && <NewDispute reload={reload}/>}<a href="/support" className="text-link">Get billing support</a></div>}
 </RecordWorkspace>;}
