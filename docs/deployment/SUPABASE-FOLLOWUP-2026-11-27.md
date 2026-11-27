> BUILD IN PROGRESS — historical interim instructions below are superseded. The owner requested one final consolidated SQL/configuration handoff after implementation. Do not run this interim checklist now. Known owner-reported live state is 001–039; current local development is 040–042 and may advance. The sequence fix is 042 here, not the conflicting external draft 040.

# Supabase follow-up for the connected chat

Target only: `fmjzskjkvdbffwkiujnu`. Branch: `ui-revamp`, use its latest pushed revision.

## Reported completed deployment

The owner relayed the other chat's result: migrations 001–038 from `4a2fd0e` were applied with all 38 checksums matching, no failed migration/reset/site publication. Catalog results: 95 public tables with RLS enabled, 10 public functions, 24 enabled triggers, two RLS policies. That chat's receipt path was `/workspace/scratch/smartclamp-fmjzskjkvdbffwkiujnu-migrations.json`; this file is not available in the implementation workspace. Preserve a sanitized copy of that receipt under `docs/deployment/receipts/` or return its contents without credentials. These are owner-reported results until the receipt is available here.

## Authorized next migration

Apply only missing `039_signal_investigations.sql` and `040_transport_reports.sql`. 039 adds `signal_reviews`, linking a signed device signal to its reporter's support ticket and optional inspection work order; it enables RLS and revokes direct anon/authenticated access. Do not edit or reapply 001–038. Inspect current history and exact checksums first. The prepared `fmjzskjkvdbffwkiujnu-bootstrap.sql` is now checksum-tracked through 040; the migration runner skips matching existing entries and refuses mismatches/unknown history. 040 adds signed gateway modem counters with RLS and no direct browser access. Record the new migrations and catalog verification in the receipt. Do not reset data or publish/deploy the site.

## Live checks to run with the connected administrative tools

1. Confirm all expected migrations/checksums through the latest checkout (currently 040). Check that no migration is partial and all expected application triggers remain enabled.
2. Inspect effective table, schema, sequence and function privileges for `anon` and `authenticated`. Most tables intentionally have **no browser policy** and are accessed through the scoped backend API. Migration 009 retains just own-profile and own-notification browser SELECT policies; do not add broad policies to increase the count.
3. Exercise own-row isolation for those two policies and denial of private schema/table writes/reads. If fixtures are needed, use synthetic identities inside a transaction that ends in **ROLLBACK**. Do not modify actual customers, send OTP/email/SMS or leave fixture accounts/data behind. Separate catalog checks from runtime policy checks in the receipt.
4. Inspect public/private `SECURITY DEFINER` functions, owners, search paths and executable grants. Report any callable path that bypasses the intended scope. Do not silently widen privileges or rewrite deployed migrations; provide a reviewed new migration for a real issue.
5. Inspect Supabase Auth configuration: Google enabled/configured status, verified email signup/SMTP status, phone/SMS provider status, site URL and approved redirects, recovery redirects, JWT expiry and refresh-token rotation/reuse controls. Compare actual URLs with the deployment's `APP_ORIGIN` and current auth callback path. Report missing configuration without printing credentials. Do not turn off verification or relax redirect restrictions to make tests pass.
6. Check whether the intended **backend runtime** has working `DATABASE_URL` (TLS), `SUPABASE_URL`, `SUPABASE_ANON_KEY` and can reach Auth/Postgres. Store secrets only in approved deployment settings, not the repository/chat/receipt. A service-role HTTP key is not a SQL connection string. The frontend must never receive DB passwords, management tokens or private signing/encryption keys.
7. If that chat can access the deployed API, call `/api/v1/health`: schema current is a database readiness check only. Check unauthenticated private API routes deny access. Full sign-up/login/refresh and role/device/payment/OTA acceptance need the configured API, providers and qualified hardware; SQL catalog counts cannot prove those loops.

## Return

Return exact applied migrations and hashes; catalog/policy/privilege checks with expected/actual results; sanitized Auth configuration findings; API health result if reachable; and unresolved configuration or implementation issues. Explicitly distinguish passed, failed and not run. No real charges, utility vending, SMS/email blasts, device switching or firmware publication are authorized by this database follow-up.
