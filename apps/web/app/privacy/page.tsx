import PublicShell from "@/components/PublicShell";
export default function Page() {
  return (
    <PublicShell>
      <div className="container" style={{ padding: "32px 0", maxWidth: 720 }}>
        <h1 style={{ color: "var(--navy)" }}>Privacy Policy</h1>
        <p style={{ color: "var(--muted)" }}>
          Last updated: 2026-11-09 · Masked identity, rate limits, scoped
          tokens, no private data in public views.
        </p>
        <div className="card" style={{ marginTop: 16 }}>
          <h3>What we collect</h3>
          <ul>
            <li>
              Phone + name for account; building/address/rooms via landlord;
              meter number + DisCo if linked
            </li>
            <li>
              Signed telemetry: voltage/current/power/energy counters, clock
              quality, coverage
            </li>
            <li>
              Payments: Paystack references (never bank PIN), vending status
            </li>
            <li>
              Support: scoped tickets + private attachments (signed URLs 15 min,
              scanned)
            </li>
          </ul>
          <h3>What we don't expose</h3>
          <ul>
            <li>
              Public device view shows only published usage/bill/status — no
              phone/address/history.
            </li>
            <li>
              Anonymous meter validation shows masked identity —
              provider-approved masking + rate limits.
            </li>
            <li>
              Reports are signed canonical bytes with hashed public tokens,
              revocable, noindex/no-store.
            </li>
          </ul>
          <h3>Access control</h3>
          <p style={{ color: "var(--muted)" }}>
            Tenant sees own room/occupancy; homeowner sees own devices; landlord
            sees owned building aggregate; installer sees assigned jobs only;
            utility sees contracted region aggregates + approved drilldown
            (logged); ops scoped to A–K panels. Deny by default — identity from
            validated Supabase JWT, role from trusted memberships.
          </p>
          <h3>Retention</h3>
          <p style={{ color: "var(--muted)" }}>
            Raw telemetry 24 months proposed; financial/audit 7 years pending
            counsel; anonymized aggregates after. Never promise final regulatory
            compliance without review.
          </p>
          <h3>Your rights</h3>
          <ul>
            <li>
              Revoke viewer grants, consent, public report tokens anytime.
            </li>
            <li>
              Occupancy transfer preserves history — former tenant cannot read
              new occupancy.
            </li>
            <li>
              Verification reports are immutable stored bytes — verify never
              recomputes from mutable rows.
            </li>
          </ul>
        </div>
      </div>
    </PublicShell>
  );
}
