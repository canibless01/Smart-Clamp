# Architecture decision: recommend Supabase
Status: recommendation for this foundation, not a claim a live backend has been deployed.

| Concern | Supabase/Postgres | Firebase |
|---|---|---|
| Rooms, occupancy, bills, device topology | foreign keys and relational queries | Firestore needs denormalization or Data Connect/SQL design |
| Payment posting | transactions, uniqueness, ledger constraints | possible with transactions/functions, more cross-document coordination |
| Audit/report exports | SQL and indexed joins | projections and specialized export pipelines |
| Live UI/auth/files | Realtime, Auth, Storage | strong Realtime/Auth/Storage/offline SDKs |
| Change management | versioned SQL migrations, reset/diff CI | rules/indexes/functions also need versioning; config alone is insufficient |
| ESP32 access | authenticated backend ingestion | authenticated backend ingestion also recommended |

A Firebase bucket/config embedded in frontend code identifies a project; it does not supply authorization or remove server engineering. Supabase's public key is also safe only with correct access policies. Neither platform should expose privileged database credentials or control signing secrets to devices/browsers. Choose Supabase for this strongly relational product; revisit only with measured cost/latency or team constraints. No Timescale requirement until hosted extension availability and volume justify it; plain partitioned Postgres is viable.

## Boundaries
Next.js public SSR and responsive app → Flask API for domain reads/writes. Supabase Auth supplies user identity; Flask validates JWT signature, issuer, audience, expiry and derives role from trusted membership, never X-Test headers. Browser may use scoped Realtime subscriptions; never grants broad raw telemetry access. Flask validates ownership, capabilities, feature rollout and consent. Service-role access bypasses RLS, so it is never a substitute for authorization; use least-privilege roles and user-context reads where possible.

Devices → gateway/hub (ESP-NOW/RS485) → authenticated HTTPS ingestion → durable inbox → validated immutable events → worker/rule engine → command outbox → delivery → device acknowledgment. Devices never connect directly to a public Postgres table or accept unsigned commands. Payment webhook → signature check → unique provider reference → locked wallet/ledger transaction → fulfillment outbox → confirmed vending or clearly pending status. Do not couple API process memory to durable wallet or command state.

Services: Next.js, Flask, worker/scheduler, Postgres/Auth/Storage/Realtime, device ingress/command delivery, provider adapters for Paystack/Africa's Talking and IoT SIM. MQTT is optional behind the same contracts, not an additional requirement. Queue/outbox retries have exponential backoff, bounded attempts and operator visibility. Keep deterministic rule computation versioned and idempotent; delayed/backfilled data cannot retroactively trigger a stale relay action.

## Data ownership and reproducibility
See database/README.md. Apply migrations in order to a disposable project in CI, verify schema and RLS tests, then stage. Never make an undocumented dashboard schema change. Capture dashboard-side Auth/Storage settings as versioned configuration too. Record deployment migration version and Git SHA, take backups, rehearse recovery. Data fixes are reviewed scripts; secrets are injected, never committed. The supplied SQL is reference material with defects, not a safe migration.

## Website implementation boundary
Current implementation exists in apps/web, apps/api and services/worker. See [launch readiness](LAUNCH-READINESS.md) and [runtime API](API-RUNTIME.md) for tested scope and incomplete integrations. This architecture describes target behavior; it is not evidence that all adapters or Realtime paths are deployed.
