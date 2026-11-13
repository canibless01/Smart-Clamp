"use client";
import { useEffect } from 'react';
export default function PwaRegistration(){useEffect(()=>{
  const prompt=(event:Event)=>{event.preventDefault();(window as any).smartclampInstallPrompt=event;window.dispatchEvent(new Event('smartclamp:pwa-ready'));};
  window.addEventListener('beforeinstallprompt',prompt);
  if('serviceWorker' in navigator && window.isSecureContext)void navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).catch(()=>{});
  return()=>window.removeEventListener('beforeinstallprompt',prompt);
},[]);return null;}
