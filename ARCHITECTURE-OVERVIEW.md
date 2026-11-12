# SmartClamp current architecture

Next.js (`apps/web`) calls the Flask API (`apps/api`), which verifies Supabase identities or device HMAC envelopes and queries PostgreSQL. The separate durable worker (`services/worker`) processes committed outbox records and configured provider calls. Firmware never directly writes the database.

The broader product architecture is described in [implementation contract](docs/IMPLEMENTATION-CONTRACT.md). Current implementation and test evidence are in [launch readiness](docs/LAUNCH-READINESS.md) and [runtime API](docs/API-RUNTIME.md). Those documents supersede earlier statements that all vertical slices were physically verified.

PostgreSQL is required; financial state and identities have no in-memory/SQLite fallback. Payment provider references persist before outbound calls; callbacks are authenticated and transactions verified before reservation. Physical meter-token entry and physical relay observation are distinct from payment and command requests. Browser connectivity, device last contact, supply observations and relay feedback remain separate facts.

Direct browser Realtime/storage integration is not currently enabled. The API enforces scoped access and browsers refetch persisted projections; do not infer a deployed live publication from the aspirational architecture.

Six ESP32 targets currently compile bench entrypoints. Portable runtime/policy/crypto logic is tested, but production sensor, flash, transport, provisioning, optical and actuator adapters are unfinished. See [firmware configuration](firmware/HARDWARE-CONFIG.md).
