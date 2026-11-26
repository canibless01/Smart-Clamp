import catalog from '../../../contracts/alert-types.json';
export const alertCatalog=catalog;
export type AlertType=keyof typeof catalog;
export type ExperienceEvent={id:string;alertType:AlertType;severity:string;iconId:string;soundId:string;hapticPattern:number[];message:string;createdAt:string;source:'recorded'|'isolated_qa';notificationId?:string;acknowledged?:boolean;snoozedUntil?:string;details?:Record<string,unknown>};
const listeners=new Set<(event:ExperienceEvent)=>void>();
export function publishExperience(event:ExperienceEvent){listeners.forEach(listener=>listener(event));}
export function subscribeExperience(listener:(event:ExperienceEvent)=>void){listeners.add(listener);return()=>{listeners.delete(listener);};}
export const templateAliases:Record<string,AlertType>={'supply.lost':'supply_lost','supply.restored':'supply_restored','relay.changed':'relay_changed','payment.confirmed':'topup_success','wallet.low':'low_credit','wallet.zero':'credit_empty','device.offline':'device_offline','device.online':'device_online',tamper:'tamper',protection:'protection'};
export function recordedEvent(row:any):ExperienceEvent{const type=(row.payload?.alert_type in catalog?row.payload.alert_type:'info') as AlertType;const presentation=catalog[type];return {id:String(row.id),notificationId:String(row.id),alertType:type,...presentation,message:row.payload?.message||presentation.label,createdAt:row.created_at,source:'recorded',acknowledged:!!row.acknowledged_at,snoozedUntil:row.snoozed_until,details:row.payload};}
export type SensoryPreferences={audio_enabled:boolean;muted:boolean;haptics_enabled:boolean;volume:number;per_type:Partial<Record<AlertType,boolean>>;quiet_hours:{enabled:boolean;start:string;end:string}};
export const defaultSensory:SensoryPreferences={audio_enabled:false,muted:true,haptics_enabled:false,volume:.35,per_type:{},quiet_hours:{enabled:true,start:'22:00',end:'07:00'}};
export function quietNow(p:SensoryPreferences,date=new Date()){if(!p.quiet_hours.enabled)return false;const bits=new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Lagos',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(date).split(':').map(Number),now=bits[0]*60+bits[1],mins=(s:string)=>{const [h,m]=s.split(':').map(Number);return h*60+m;},start=mins(p.quiet_hours.start),end=mins(p.quiet_hours.end);return start===end||start<end?start===end||now>=start&&now<end:now>=start||now<end;}

export function normalizeSensory(value:unknown):SensoryPreferences {
 const v=value&&typeof value==='object'?value as Partial<SensoryPreferences>:{};
 const time=(x:unknown,fallback:string)=>typeof x==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(x)?x:fallback;
 return {audio_enabled:v.audio_enabled===true,muted:v.muted!==false,haptics_enabled:v.haptics_enabled===true,volume:typeof v.volume==='number'&&Number.isFinite(v.volume)?Math.max(0,Math.min(1,v.volume)):.35,per_type:Object.fromEntries(Object.entries(v.per_type&&typeof v.per_type==='object'?v.per_type:{}).filter(([k,x])=>k in alertCatalog&&typeof x==='boolean')),quiet_hours:{enabled:v.quiet_hours?.enabled!==false,start:time(v.quiet_hours?.start,'22:00'),end:time(v.quiet_hours?.end,'07:00')}};
}
