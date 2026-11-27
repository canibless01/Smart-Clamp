# Building energy comparison and topology checks

27 November 2026 (Africa/Lagos). Read-only reconciliation checkpoint `6f1bdff`, followed by the recorded-topology checkpoint containing this record.

- Full isolated PostgreSQL/GoTrue/provider-fixture API suite: 90 tests, 89 passed, one separate actual SMTP class skipped.
- Production Next.js build and native/contracts: passed.
- Existing landlord room/claim/invite/payment journey and mobile unknown-comparison journey: two passed.
- Topology save browser flow initially caught a mobile overflow from the long native select and fieldset intrinsic width. Short/copyable IDs and constrained fields corrected it; targeted repeat passed at 390x844. This is acceptance across runs, not a clean full browser sweep.
- API checks verify approved policy gating, scope isolation, signed-source reference calculation, counter reset/null/clock/epoch/gap rejection, genuine measured zero versus unknown, no relay mutation, topology CAS/idempotency and retained old edge/audit history.

No additional migration beyond 043, live Supabase change, real charge, relay operation or manual publication. Recorded topology does not independently certify wiring. Persistent drift confirmation, physical topology approval, unaccounted-energy ledger, pooled settlement and utility notification from confirmed drift remain open in the complete register. Never automatically charge a residual or identify it as theft.

Private local logs: `/tmp/smartclamp-topology-full-api.log`, `/tmp/smartclamp-topology-final-build.log`, `/tmp/smartclamp-topology-contracts.log`, `/tmp/smartclamp-topology-browser-tests.log`, `/tmp/smartclamp-topology-mobile-retry.log`. These may not survive a new environment.
