# Review all SmartClamp pages

**86 actual browser screenshots**: the original 76 from 13 November, plus 10 workflow updates captured 15 November 2026 in Lagos time. Every current page template is represented; capture dates vary. The updates include the new support request list, dispute discussion, finance handoff and email feedback review.

- [Filterable visual gallery — start here](gallery.html)
- [All 86 screenshots, page by page](INDEX.md)
- [Machine-readable inventory](captures.json)
- [Original 76-page dashboard contact sheet](gallery-overview.jpg)

| Workspace | Captures |
|---|---:|
| admin | 2 |
| engineer | 1 |
| finance | 3 |
| homeowner | 28 |
| installer | 2 |
| landlord | 5 |
| onboarding | 1 |
| ops | 5 |
| public | 29 |
| support | 4 |
| tenant | 3 |
| utility | 3 |

## Data and capture limits

These are actual production-build screenshots with isolated PostgreSQL/GoTrue
sign-in and real API handlers. No browser-network mocks or generated designs are
used. The QA banner is added only by the capture tool. The run rejects unexpected
private-page errors and page-wide overflow, and includes six mobile views.

Homeowner history contains a day of signed simulated readings processed by the
real ingestion/worker. Its wallet reflects three local payment-fixture
reconciliations and token attestations, followed by measured usage debits. The
resident paid into their own room wallet through the configured central-meter
destination. Resident history starts at occupancy; a recently joined room
correctly has little history.

Staff/utility notices were previewed and committed through the real API. Utility
authority is an explicit QA grant with recipient opt-in, not a real partnership.
The new support/finance captures show saved case ownership, replies, closure and reopening through actual APIs. The older service-composer image is retained as a historical capture. Ops/engineering/admin tables also contain other shared QA
records. Production has no seeded customers, balances or authority grants.

The engineering capture contains a real compiled `house_full` binary, signed
stored artifact and pending canary. No ESP is connected; a healthy boot is not
shown. Relay state stays unconfirmed without physical feedback. No image proves
hardware qualification, merchant charges or handset delivery.

Reports are stored signed measurement snapshots with coverage warnings. Dispute
evidence comes from an explicitly supplied **manual QA bill**, not an implemented
bill-issuance flow or a certified utility bill. The installation request/support
thread are actual saved QA records; no fulfilled installation is claimed. The new case captures show actual tested resolution/reopening, without a monetary adjustment.

Unavailable features show their real gated pages: community, smart-device
integrations, utility control, reader setup, organization administration, incident
detail, public device sharing and bank transfers. Subscription checkout remains
gated. Finance now has the implemented dispute review workspace. Complete A–M panels, monetary adjustments/refunds, formal support SLA policy and the remaining implementation matrix are still unfinished. No imaginary successful
panels were created. Final legal/company/support/pricing content needs owner input.

## Reproduce

Start the email-enabled isolated `tools/qa_services.py` stack with SQL through
035. Build the real firmware `house_full` target. From the repository root:

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

For only the workflow updates, first run the real support and dispute browser journeys against `tools/browser_qa.py` with its private fixture. Then run from `apps/web`:

```sh
SMARTCLAMP_BROWSER_FIXTURE=/tmp/smartclamp-browser-email-receipts.json node tools/capture-workflow-updates.mjs
```

This appends/replaces only the 10 named workflow captures, preserving the earlier gallery. The shared index generator rebuilds the filterable gallery and Markdown inventory. The actual current private fixture path may differ.
