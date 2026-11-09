'use client'
import AppShell from '@/components/AppShell'
import { LiveMetric, StatusBadge } from '@/components/LiveMetric'
import UsageChart from '@/components/UsageChart'
import { useState } from 'react'
export default function Page(){
  const [device,setDevice]=useState('pole-01')
  const [range,setRange]=useState('7d')
  return <AppShell role="homeowner">
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
      <div><h1 style={{margin:0,color:'var(--navy)'}}>Homeowner Dashboard</h1><p style={{color:'var(--muted)',margin:0}}>Live graph · verification badge requires complete intervals · Basic Pro analytics · Pro control row (if eligible)</p></div>
      <div style={{display:'flex',gap:8}}>
        <select value={device} onChange={e=>setDevice(e.target.value)} className="input" style={{width:140}}><option value="pole-01">Pole-01 (my pole)</option><option value="pole-02">Pole-02</option></select>
        <a href="/devices/demo-id" className="btn btn-secondary">Device detail</a>
      </div>
    </div>
    <StatusBadge supply="present" connectivity="online" relay={{observed:true}} />
    <div className="grid-12" style={{marginTop:16}}>
      <div style={{gridColumn:'span 8'}}><UsageChart /></div>
      <div style={{gridColumn:'span 4'}}>
        <div className="card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontWeight:700}}>Verification</span>
            <span className="badge badge-verified">Verified</span>
          </div>
          <p style={{fontSize:13,color:'var(--muted)',marginTop:8}}>Matched 5-min intervals, 95% coverage, SUM(poles) vs transformer 10% threshold. Three consecutive windows above threshold → suspected_mismatch. Current: aligned.</p>
          <div style={{fontSize:12,color:'var(--muted)'}}>No control elements for Basic/Basic Pro — verification badge requires complete matching intervals, not merely device online. Zero current alone is never theft.</div>
          <a href="/verification-reports/demo-token" className="btn btn-secondary" style={{marginTop:12}}>Generate report</a>
        </div>
        <div className="card" style={{marginTop:12}}>
          <div style={{fontWeight:700}}>Basic Pro Analytics</div>
          <div style={{display:'grid',gap:8,marginTop:8}}>
            <div style={{display:'flex',justifyContent:'space-between'}}><span>Bill forecast</span><strong>₦4,500 (182 kWh)</strong></div>
            <div style={{display:'flex',justifyContent:'space-between'}}><span>Power factor</span><span>0.92 ✓</span></div>
            <div style={{display:'flex',justifyContent:'space-between'}}><span>Peer vs avg</span><span>-3% efficient</span></div>
          </div>
          <div style={{display:'flex',gap:8,marginTop:12}}>
            <a href="/history" className="btn btn-secondary" style={{flex:1}}>History</a>
            <a href="/billing" className="btn btn-secondary" style={{flex:1}}>Billing</a>
          </div>
          <div style={{fontSize:11,color:'var(--muted)',marginTop:8}}>Predictions gated by entitlement + physical capability + actor scope + consent. Never UI-only security.</div>
        </div>
      </div>
      <div style={{gridColumn:'span 4'}}><LiveMetric label="Live power" value="1.8" unit="kW" observedAt="2026-11-09T12:00:00Z" quality="verified" coverage="97%" /></div>
      <div style={{gridColumn:'span 4'}}>
        <div className="card">
          <div style={{fontWeight:700}}>Pro Control (if commissioned)</div>
          <div style={{fontSize:13,color:'var(--muted)'}}>Requires step-up, OFF-reason check, 120s expiry, feedback ACK. Hardware relay upgrade needs commissioned installation — plan upgrade alone cannot enable pins.</div>
          <div style={{display:'flex',gap:8,marginTop:12}}>
            <a href="/control" className="btn btn-primary">Control</a>
            <a href="/devices/demo-id/commands" className="btn btn-secondary">Activity</a>
          </div>
          <div style={{fontSize:12,color:'var(--red)',marginTop:8}}>No control for Basic — hidden + capability explained.</div>
        </div>
      </div>
      <div style={{gridColumn:'span 4'}}>
        <div className="card">
          <div style={{fontWeight:700}}>Bill & Report</div>
          <div style={{fontSize:13}}>Current bill: ₦5,000 (2026-11) · Unpaid</div>
          <div style={{display:'flex',gap:8,marginTop:12,flexWrap:'wrap'}}>
            <button className="btn btn-secondary">Dispute bill</button>
            <a href="/billing" className="btn btn-secondary">View breakdown</a>
          </div>
          <div style={{fontSize:12,color:'var(--muted)',marginTop:8}}>Lapsed subscription shows grace/read-only, never creates OFF reason.</div>
        </div>
      </div>
    </div>
  </AppShell>
}
