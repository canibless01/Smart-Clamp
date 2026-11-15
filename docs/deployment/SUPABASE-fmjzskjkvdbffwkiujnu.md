# Authorized SmartClamp Supabase target

Project URL: https://fmjzskjkvdbffwkiujnu.supabase.co

Project ref: `fmjzskjkvdbffwkiujnu`. The owner explicitly authorized applying all
repository migrations to this new project on 14 November 2026. Other organization
projects are outside this action's scope.

## Current status

**Prepared and locally tested; not yet applied to the external project.**
The public Auth endpoint is reachable and returns HTTP401 without a key. No
Supabase management connector, `SUPABASE_ACCESS_TOKEN` or external `DATABASE_URL`
was available in this workspace. The public project URL does not authorize SQL.
The migration command stopped before remote access because the management token
is missing. No external migration receipt or success is claimed.

## Prepared migration

[Review the complete 001–035 SQL bundle](fmjzskjkvdbffwkiujnu-bootstrap.sql).
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
