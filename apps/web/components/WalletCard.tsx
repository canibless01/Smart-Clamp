import { formatNaira } from '@/lib/api'
export default function WalletCard({ available, reserved, ledgerVersion, updatedAt }: { available:number, reserved:number, ledgerVersion?:number, updatedAt?:string }) {
  return (
    <div className="card">
      <div style={{fontWeight:700}}>Wallet</div>
      <div style={{fontSize:28,fontWeight:800,color:'var(--navy)',marginTop:8}}>{formatNaira(available)}</div>
      <div style={{color:'var(--muted)',fontSize:13}}>available · reserved {formatNaira(reserved)} · ledger v{ledgerVersion||0}</div>
      {updatedAt && <div style={{fontSize:12,color:'var(--muted)',marginTop:4}}>updated {new Date(updatedAt).toLocaleString('en-NG',{timeZone:'Africa/Lagos'})}</div>}
      <div style={{display:'flex',gap:8,marginTop:12,flexWrap:'wrap'}}>
        <a href="/billing" className="btn btn-primary">Recharge</a>
        <a href="/history" className="btn btn-secondary">History</a>
      </div>
      <div style={{fontSize:12,color:'var(--muted)',marginTop:8}}>Electricity credit ≠ subscription. Money held separately from service plan.</div>
    </div>
  )
}
