"use client";
import {useEffect,useState} from 'react';
import {apiFetch,formatNaira} from '@/lib/api';
export default function ConfiguredPlanPrice({tier,fallback,detail}:{tier:string;fallback:string;detail:string}){
 const [data,setData]=useState<any>(null);
 useEffect(()=>{const c=new AbortController();void apiFetch('/public/business-settings',{signal:c.signal}).then(setData).catch(()=>{});return()=>c.abort();},[]);
 const value=data?.plan_prices?.[tier];return <>{typeof value==='number'?formatNaira(value):fallback}<small>{typeof value==='number'?'Approved monthly subscription · electricity separate':detail}</small>{typeof value==='number'&&!data.subscription_checkout_available&&<small>Subscription checkout is not enabled yet.</small>}</>;
}
