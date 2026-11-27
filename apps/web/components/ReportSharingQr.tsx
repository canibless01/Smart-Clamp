"use client";
import {useEffect,useState} from 'react';
import qrcode from 'qrcode-generator';
export default function ReportSharingQr({path,expiresAt}:{path:string;expiresAt:string}){
 const [svg,setSvg]=useState('');
 useEffect(()=>{if(!/^\/verification-reports\/[A-Za-z0-9_-]+$/.test(path)){setSvg('');return;}const qr=qrcode(0,'M');qr.addData(new URL(path,location.origin).href,'Byte');qr.make();setSvg(qr.createSvgTag({cellSize:4,margin:16,scalable:true}));},[path]);
 return svg?<section className="report-sharing-qr"><h3>Share this snapshot</h3><div data-report-qr role="img" aria-label="Report sharing QR code" dangerouslySetInnerHTML={{__html:svg}}/><p>Anyone with this code can read the shared snapshot until {new Date(expiresAt).toLocaleString('en-NG',{timeZone:'Africa/Lagos'})} (Lagos), unless sharing is revoked earlier.</p><p>The code is generated on this device. No third-party QR service receives the link.</p></section>:null;
}
