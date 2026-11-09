'use client'
import PublicShell from '@/components/PublicShell'
import { useState } from 'react'
export default function Page(){
  const [cat,setCat]=useState('device')
  return <PublicShell>
    <div className="container" style={{padding:'32px 0'}}>
      <h1 style={{color:'var(--navy)'}}>Contact Support</h1>
      <div className="grid-12" style={{marginTop:16}}>
        <div className="card" style={{gridColumn:'span 8'}}>
          <h3>Open a Ticket</h3>
          <p style={{color:'var(--muted)'}}>Scoped to owner/reporter/assigned actor/status/SLA. Append-only conversation, private attachments (signed URL 15 min, MIME/size/malware scan).</p>
          <div style={{display:'grid',gap:12,marginTop:12}}>
            <select value={cat} onChange={e=>setCat(e.target.value)} className="input"><option value="device">Device</option><option value="payment">Payment</option><option value="billing">Billing</option><option value="installation">Installation</option><option value="account">Account</option><option value="other">Other</option></select>
            <input className="input" placeholder="Subject — max 200 chars" />
            <textarea className="input" placeholder="Message — max 4000 chars" rows={4} />
            <div style={{border:'1px dashed var(--border)',borderRadius:12,padding:16,textAlign:'center'}}>
              <div style={{fontWeight:600}}>Drop evidence (photo/pdf) — max 10 MiB each</div>
              <div style={{fontSize:12,color:'var(--muted)'}}>Accepted: image/jpeg, image/png, application/pdf · SHA256 verified · Quarantined until scan</div>
              <button className="btn btn-secondary" style={{marginTop:8}}>Attach file</button>
            </div>
            <button className="btn btn-primary">Create ticket</button>
          </div>
          <div style={{fontSize:12,color:'var(--muted)',marginTop:12}}>SLA proposed: electrical hazard → immediate local-service instruction; critical alert ack 15 min staffed; payment failure 1 business day; general 2 business days. No 24/7 claim without staffing.</div>
        </div>
        <div className="card" style={{gridColumn:'span 4'}}>
          <h3>Help Center</h3>
          <div style={{display:'grid',gap:8,marginTop:8}}>
            <a href="/connection-help" className="btn btn-secondary">Connection help</a>
            <a href="/faqs" className="btn btn-secondary">FAQs</a>
            <a href="/devices/demo-id" className="btn btn-secondary">Device diagnostics</a>
            <a href="/support/tickets/demo-id" className="btn btn-secondary">My tickets</a>
          </div>
          <h4 style={{marginTop:16}}>Contact Channels</h4>
          <div style={{fontSize:13,color:'var(--muted)'}}>Only confirmed channels published — no invented contacts.<br/>📧 support@smartclamp.ng<br/>📞 +234 801 234 5678<br/>💬 WhatsApp: +234 809 876 5432</div>
        </div>
      </div>
    </div>
  </PublicShell>
}
