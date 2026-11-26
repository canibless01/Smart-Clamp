"use client";
import RollingReadout from "./RollingReadout";
import Icon from "./Icon";
const format=(value:number)=>new Intl.NumberFormat("en-NG",{maximumFractionDigits:2}).format(value);
export function CreditTank({amount,unit,capacity,secondary,daysLeft,onTopup}:{amount:number|null;unit:string;capacity?:number|null;secondary?:string;daysLeft?:number|null;onTopup?:()=>void}){
 const known=amount!==null&&Number.isFinite(amount),ratio=known&&capacity&&capacity>0?Math.max(0,Math.min(1,amount!/capacity)):null;
 return <div className={'credit-balance '+(known&&amount===0?'is-empty':'')} data-instrument="credit-balance"><div className="credit-balance-value"><strong><RollingReadout value={known?format(amount!):'—'}/></strong><span>{unit}</span></div>{secondary&&<span className="credit-balance-money">{secondary}</span>}<div className={'credit-balance-track '+(ratio===null?'is-unscaled':'')} role="img" aria-label={ratio===null?'Credit percentage unavailable':Math.round(ratio*100)+' percent of recorded funding reference'}>{ratio!==null&&<span style={{width:ratio*100+'%'}}/>}</div>{daysLeft!=null&&<small>{format(daysLeft)} estimated days left</small>}{onTopup&&<button className="text-link" onClick={onTopup}>Buy units <Icon name="arrow" size={16}/></button>}</div>;
}
