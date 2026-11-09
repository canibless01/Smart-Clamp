# Builder handoff and build sequence
1. Read README, PRODUCT, DECISIONS, DESIGN, ARCHITECTURE and pages/INDEX. Reference transcriptions supply all original detail; no Word/PDF reader needed.
2. Resolve contract gaps in contracts/REVIEW.md and hardware release gates in firmware/README.md. Do not treat upstream sample snippets or schema as deployed code.
3. Obtain owner go-ahead before implementing the website. First delivery should be the public landing page and lookup states with labeled provider sandbox behavior; review desktop and mobile together.
4. Establish versioned database migrations, Auth configuration, RLS, private storage policies, durable ledger/outbox and cross-tenant tests before private dashboards.
5. Implement signup/login plus assigned building/room/device relationships. Derive role server-side; installer/internal/utility privilege requires invitation/review.
6. Build shared-meter pilot vertical slice: calibrated reading → authenticated ingest → durable usage → scoped dashboard → payment webhook → atomic ledger → confirmed meter vending → replay-resistant command → physical acknowledgment. Validate failed/refunded/duplicate/delayed messages, outage and partial topology.
7. Add privacy-safe public device projection, disputes/evidence, reports and operational panels with staff access logs. Add scheduling/budget only with tested device clock and offline behavior.
8. Ship Basic Pro claims only after validation; add phase2 integrations through provider adapters. Later phases remain gated.

## Definition of done
Every route has loading/empty/error/forbidden/stale states, desktop and phone acceptance, keyboard/reduced-motion checks, and correct scoped data. Real services are verified in sandbox then staged deployment. No mock tokens, invented payment success, in-memory financial ledger, test headers, bypassed TLS or fake verified badges in production.

## This handoff's deliverables and limits
Source text preserved; complete source page inventory plus supporting route specifications; proposed tokens, responsive/motion behavior; architecture decision and discrepancies; source API and schema references; shared firmware policy implementation and tests; six reference firmware profiles. Board-specific sensor/transport/provisioning/OTA adapters and full website/backend remain implementation work. Firmware is not field-release software. Database reference is not a migration and no complete deployable SQL schema is claimed. Follow database/README for the required migration contract rather than applying source fragments blindly.

Revision2: start with [implementation contract](IMPLEMENTATION-CONTRACT.md). It defines normative precedence, gap closures and the complete loop catalog.
