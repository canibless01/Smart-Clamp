"use client";
import Icon from "./Icon";
import {useState} from 'react';
export function shortReference(value:string){return value.length>18?value.slice(0,8)+'…'+value.slice(-4):value;}
export default function ShortId({value}:{value:string}){const [copied,setCopied]=useState(false);return <span className="short-reference"><code title={value}>{shortReference(value)}</code><button type="button" aria-label={copied?'Reference copied':'Copy reference'} title="Copy full reference" onClick={async e=>{e.preventDefault();e.stopPropagation();try{await navigator.clipboard.writeText(value);setCopied(true);}catch{setCopied(false);}}}>{copied?<Icon name="check" size={16}/>:<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M15 8V3H3v12h5"/></svg>}</button></span>;}
