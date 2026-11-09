'use client'
import PublicShell from '@/components/PublicShell'
export default function Page({params}:{params:{token:string}}){
  return <PublicShell>
    <div className="container" style={{padding:'32px 0'}}>
      <h1 style={{color:'var(--navy)'}}>Verification Report</h1>
      <p style={{color:'var(--muted)'}}>Signed public report — re-verified on each load via signature + SHA256 of stored bytes, not recomputed from mutable rows.</p>
      <div className="card" style={{marginTop:16}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <strong>Report {params.token.slice(0,12)}…</strong>
          <span className="badge badge-verified">Signature valid</span>
        </div>
        <div style={{marginTop:12,background:'var(--canvas)',padding:12,borderRadius:8}}>
          <div style={{fontSize:13}}><strong>Period:</strong> 2026-10-01 → 2026-10-31</div>
          <div style={{fontSize:13}}><strong>Subject:</strong> Device demo-id (FUTA Lodge A)</div>
          <div style={{fontSize:13}}><strong>Usage:</strong> 142 kWh · 96% coverage · Tariff v1 · Ledger v42</div>
          <div style={{fontSize:12,color:'var(--muted)',marginTop:8}}>SHA256: a3f9e1…c1d2b4 · Key: prod-2026 · Issued: 2026-11-09 12:00 UTC · Expires: 2027-11-09</div>
        </div>
        <div style={{display:'flex',gap:8,marginTop:12,flexWrap:'wrap'}}>
          <button className="btn btn-primary">Download PDF</button>
          <button className="btn btn-secondary">Download CSV</button>
          <button className="btn btn-secondary">Verify signature</button>
          <a href="/history" className="btn btn-secondary">History</a>
        </div>
        <div style={{fontSize:11,color:'var(--muted)',marginTop:8}}>Public token: random, opaque, revocable, hashed in DB. No private data in push body. Verify historical stored bytes, never mutable live rows.</div>
      </div>
      <div style={{marginTop:16,display:'flex',gap:8}}>
        <a href="/disputes" className="btn btn-secondary">Disputes</a>
        <button className="btn btn-secondary">Revoke report</button>
      </div>
    </div>
  </PublicShell>
}
