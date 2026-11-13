# Review all SmartClamp pages

**76 actual browser screenshots**, captured 13 November 2026 in Lagos time.
Every current `apps/web/app/**/page.tsx` template has a corresponding capture,
including all six products, three plans and dynamic record pages.

- [Filterable visual gallery — start here](gallery.html)
- [All 76 screenshots, page by page](INDEX.md)
- [Machine-readable inventory](captures.json)
- [Dashboard contact sheet](gallery-overview.jpg)

| Workspace | Captures |
|---|---:|
| Homeowner account, data and forms | 26 |
| Landlord/building/rooms | 4 |
| Resident | 3 |
| Operations and service messages | 4 |
| Engineering firmware | 1 |
| Installer | 2 |
| Utility | 3 |
| Superadmin | 2 |
| Support service composer | 1 |
| Profile completion | 1 |
| Public/product/plan/authentication | 29 |

## Data and capture limits

These are actual production-build screenshots with isolated PostgreSQL/GoTrue
sign-in and real API handlers. No browser-network mocks or generated designs are
used. The QA banner is added only by the capture tool. The run rejects unexpected
private-page errors and page-wide overflow, and includes four mobile views.

Homeowner history contains a day of signed simulated readings processed by the
real ingestion/worker. Its wallet reflects three local payment-fixture
reconciliations and token attestations, followed by measured usage debits. The
resident paid into their own room wallet through the configured central-meter
destination. Resident history starts at occupancy; a recently joined room
correctly has little history.

Staff/utility notices were previewed and committed through the real API. Utility
authority is an explicit QA grant with recipient opt-in, not a real partnership.
Support's capture shows its implemented service composer, not a complete case
management panel. Ops/engineering/admin tables also contain other shared QA
records. Production has no seeded customers, balances or authority grants.

The engineering capture contains a real compiled `house_full` binary, signed
stored artifact and pending canary. No ESP is connected; a healthy boot is not
shown. Relay state stays unconfirmed without physical feedback. No image proves
hardware qualification, merchant charges or handset delivery.

Reports are stored signed measurement snapshots with coverage warnings. Dispute
evidence comes from an explicitly supplied **manual QA bill**, not an implemented
bill-issuance flow or a certified utility bill. The installation request/support
thread are actual saved QA records, not a fulfilled order or resolved case.

Unavailable features show their real gated pages: community, smart-device
integrations, utility control, reader setup, organization administration, incident
detail, public device sharing and bank transfers. Subscription checkout remains
gated. Finance has no dedicated implemented workspace; complete A–M panels and
support case ownership/resolution remain incomplete. No imaginary successful
panels were created. Final legal/company/support/pricing content needs owner input.

## Reproduce

Start the email-enabled isolated `tools/qa_services.py` stack with SQL through
026. Build the real firmware `house_full` target. From the repository root:

```sh
SMARTCLAMP_QA_CONFIG=/tmp/smartclamp-qa-email.json .venv/bin/python tools/dashboard_gallery.py --fixture /tmp/smartclamp-gallery-expanded.json
```

Build/start the production web server against this local QA API. Then, from
`apps/web`:

```sh
SMARTCLAMP_GALLERY_FIXTURE=/tmp/smartclamp-gallery-expanded.json node tools/capture-gallery.mjs
```

Set `PLAYWRIGHT_BROWSERS_PATH` for a custom browser installation. The mode-600
fixture contains credentials/QA receipt tokens and must stay in `/tmp`, never Git.
Signing keys are distinct private temporary files. Never deploy these runners,
test providers or auto-confirm auth settings. No external project SQL was run.
