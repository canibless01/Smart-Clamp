# Authorized SmartClamp Supabase target

Project URL: https://fmjzskjkvdbffwkiujnu.supabase.co

Project ref: `fmjzskjkvdbffwkiujnu`. The owner explicitly authorized applying all
repository migrations to this new project on 14 November 2026. Other organization
projects are outside this action's scope.

## Current status

**Build remains in progress; wait for one final consolidated handoff.** The owner reports external migrations 001–039 with matching checksums. The receipts remain in the other chat's checkout and have not been read here. Local development includes 040–046, tested only in isolated QA. The sequence-privilege fix is 042; do not overwrite this branch's existing 040 with the external draft.

The latest project health check returned HTTP 401. No callable Supabase tool or configured administrative/runtime credentials are exposed here; this does not establish database/Auth/application readiness. No review accounts or external SQL were created/executed by this chat. The historical entries below preserve earlier checks, not current instructions.

## Prepared migration

[Review the complete 001–046 SQL bundle](fmjzskjkvdbffwkiujnu-bootstrap.sql).
It contains all current migration files, original SHA-256 checksums and a single
transaction. It refuses untracked public tables or unknown migration history,
skips matching applied migrations and stops on checksum drift. It creates no
customer accounts, balances, tariffs, production secrets or authority grants.

Four checks passed against isolated local PostgreSQL, including a fresh database:
all migrations apply, replay safely, checksum drift stops execution and untracked
public data is preserved/refused. This tests SQL/bundle behavior, not hosted
project access. Existing application tests separately use actual local GoTrue.

## Direct execution by the assistant

Supply `SUPABASE_ACCESS_TOKEN` through secure execution-environment settings,
with management access to the named project. Never paste it into chat or Git.
The runner uses Supabase's documented Management API and an explicit project ref.
It verifies the returned ref and ACTIVE_HEALTHY status before SQL, checks the
existing ledger, applies one transaction, and reads back every migration hash.

```sh
.venv/bin/python tools/supabase_migrate.py --project-ref fmjzskjkvdbffwkiujnu --check
.venv/bin/python tools/supabase_migrate.py --project-ref fmjzskjkvdbffwkiujnu --apply --receipt .runtime/supabase-fmjzskjkvdbffwkiujnu.json
```

The owner has already authorized this target/action; additional approval is not
needed when access becomes available. A token enables authentication only; it
does not authorize touching other projects. Credentials and provider response
bodies are never printed. If mutation HTTP outcome is uncertain, run `--check`
and review state before any reapply; the runner does not blindly repeat writes.

## SQL editor alternative

The owner can open the [target project's SQL editor](https://supabase.com/dashboard/project/fmjzskjkvdbffwkiujnu/sql/new)
and execute the reviewed bundle in that project. This is an alternative to
providing management access, not a statement that the assistant already ran it.
After execution, compare `public.schema_migrations` names/hashes with the bundle
or run the authenticated `--check` command. Do not edit checksums to silence drift.

## What SQL does not configure

Hosted Auth supplies its own `auth.users`/roles; no QA Auth schema or auto-confirm
settings belong in production. Configure real confirmed email, phone provider,
Google OAuth, exact application origin/redirects and keys separately. API, web
proxy and outbox worker need the actual deployed environment. OneSignal/Resend,
merchant activation, tariffs, device provisioning and physical qualification are
separate steps. Database completion does not certify those loops.

Management API schema verified from the official OpenAPI document:
https://api.supabase.com/api/v1-json — `POST /v1/projects/{ref}/database/query`
supports `query` and `read_only`. No unsupported magic SQL RPC is assumed.

## Recheck requested by the owner — 26 November 2026

The linked Supabase tag is visible in chat, but no callable Supabase connector was present in the active tool catalogue. Current Cloud environment status reports no configured secrets/runtime variables. The process and repository dotenv settings contain no `SUPABASE_ACCESS_TOKEN`, external `DATABASE_URL`, `SUPABASE_URL` or `SUPABASE_ANON_KEY`.

Actual read-only network checks: `https://supabase.com` returned 200; `https://api.supabase.com/v1/projects` returned 401 (authentication required). The intended project host's `/auth/v1/health` and REST endpoint failed at the Cloud proxy's CONNECT stage with 403; an outside-sandbox retry of the same health URL failed identically. This does not establish that the project is down, paused, healthy or accessible through a Supabase account. No SQL, project changes or migration success are claimed. The prepared checksum-tracked bundle now includes 001–040.

Use the administration inputs in [LAUNCH-INPUTS](../LAUNCH-INPUTS.md). The existing target/action authorization remains valid; the missing requirement is actual admin connectivity/credentials, not another approval to migrate this project.

## 27 November implementation update

Migration 039 adds the resident/utility signal-to-support-to-inspection relationship with deny-by-default RLS. The bundle includes 001–040. It has been applied only to isolated QA in this chat. The owner assigned external SQL execution to another chat; inspect its migration receipt before any external operation.

## External SQL status reported by owner — 27 November 2026

The connected chat reports applying 001–038 from 4a2fd0e with all checksums matching: 95 public tables with RLS enabled, 10 public functions, 24 enabled triggers and two policies. No reset or publication. Its receipt is in the other workspace and cannot be opened here at the reported path. Record these as owner-reported external results, not a local observation. Migration 039 remains the follow-up from this implementation batch. See [connected-chat follow-up](SUPABASE-FOLLOWUP-2026-11-27.md) for exact migration, live RLS/privilege, Auth and runtime checks.
