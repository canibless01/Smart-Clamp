"use client";
import {SignalIcon} from './SignalLight';
import RollingReadout from './RollingReadout';
export default function WorkspaceInstrument({endpoint,data}:{endpoint:string;data:any}){
 const kind=/communications/.test(endpoint)?'notice':/support|disputes/.test(endpoint)?'case':/firmware/.test(endpoint)?'firmware':/commands/.test(endpoint)?'command':/reports/.test(endpoint)?'report':/organizations/.test(endpoint)?'organization':/jobs|ops/.test(endpoint)?'operations':/wallet|payment|transaction/.test(endpoint)?'payment':null;
 if(!kind)return null;
 const tracks:Record<string,{icon:string;steps:string[]}>={notice:{icon:'bell',steps:['Audience','Review','Dispatch','Receipts']},case:{icon:'shield',steps:['Open','Review','Respond','Resolve']},firmware:{icon:'device',steps:['Upload','Signature','Canary','Device feedback']},command:{icon:'power',steps:['Authorise','Queue','Device','Signed receipt']},report:{icon:'shield',steps:['Scope','Snapshot','Signature','Share']},organization:{icon:'device',steps:['Authority','Scope','Review','Grant']},operations:{icon:'device',steps:['Inspect','Assign','Service','Review']},payment:{icon:'credit',steps:['Quote','Payment','Provider','Credit']}};
 const t=tracks[kind],count=Array.isArray(data.items)?data.items.length:null,status=typeof data.status==='string'?data.status.replace(/_/g,' '):null;
 return <aside className="workspace-instrument" aria-label={kind+' workflow reference'}><span className="workflow-emblem"><SignalIcon name={t.icon}/></span><ol>{t.steps.map((step,i)=><li key={step}><span>{i+1}</span>{step}</li>)}</ol><div className="workflow-readout">{count!==null?<><RollingReadout value={String(count)}/><small>loaded records</small></>:status?<><strong>{status}</strong><small>recorded status</small></>:<><strong>—</strong><small>No completion inferred</small></>}</div></aside>;
}
