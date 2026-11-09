import PublicShell from '@/components/PublicShell'
export default function Page(){
  return <PublicShell>
    <div className="container" style={{padding:'32px 0',maxWidth:720}}>
      <h1 style={{color:'var(--navy)'}}>Terms of Service</h1>
      <p style={{color:'var(--muted)'}}>Last updated: 2026-11-09 · Legal wording still needs professional review. All money decimal/kobo bigint; wallet and subscription separate; subscription expiry never cuts power.</p>
      <div className="card" style={{marginTop:16}}>
        <h3>1. Service</h3>
        <p>SmartClamp provides sub-metering, verification and optional relay control where hardware supports it. It does not generate, resell or distribute electricity and does not replace your utility meter. Hardware accuracy requires bench calibration; pricing pending procurement.</p>
        <h3>2. Payments</h3>
        <p>All amounts in kobo (bigint). Quote → payment → vending → credit are distinct: paying money ≠ physical meter credit until provider confirms vending. Confirmed webhook credits once per gateway reference, atomically. Checkout redirects are not proof — webhook verification required.</p>
        <h3>3. Control</h3>
        <p>Requested relay action ≠ confirmed physical action. Recharge clears only its own zero-balance restriction; cannot override protection/manual/budget/maintenance/utility OFF reasons. Most restrictive OFF wins. Landlords cannot enforce rent via cutoff; maintenance requires reason/scope/expiry/audit.</p>
        <h3>4. Privacy</h3>
        <p>Public device views are minimal publications with opaque revocable tokens and rate limits. No private address/phone in public views. Report tokens are hashed, signed, 128-bit+, revocable.</p>
        <h3>5. Liability</h3>
        <p>Mains/relay installation requires qualified installer, isolation, enclosure. Predictive fire/shock claims are research, not life-safety guarantees. Supercapacitor hold-up prioritizes logging, not guaranteed SMS. No community-wide cutoff on connectivity failure.</p>
        <h3>6. Utility</h3>
        <p>Disconnection lists are reports, never actuator inputs. Utility control requires authority + scope + consent + dispatch checks + step-up; revocation invalidates queued commands. Disputes freeze evidence snapshot, not power.</p>
      </div>
      <div style={{marginTop:16,display:'flex',gap:8}}>
        <a href="/privacy" className="btn btn-secondary">Privacy</a>
        <a href="/support" className="btn btn-secondary">Support</a>
      </div>
    </div>
  </PublicShell>
}
