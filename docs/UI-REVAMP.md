# SmartClamp UI revamp

## Source and scope

This work starts from auditor branch `arena/81bb156f-smart-clamp`, commit `10b5e80`, not the older documentation-only main branch. Local working branch: `ui-revamp`. Preserve the auditor's backend, migrations and page routes; do not replace this checkout with the previous prototype.

The owner requested a visually engaging, spacious, responsive product rather than repeated colored cards and specification text. The owner supplied Sense, Octopus Energy and Emporia screenshots, favoring Emporia's white surfaces, photography, visual product explanation and purposeful motion. Direct reference-site requests were attempted twice and returned proxy403; current live versions were not reviewed. The screenshots supply the visual reference. No third-party brand assets or product images are copied.

## Revised direction

White public canvas; quiet sage-tinted secondary surfaces; charcoal text and deep forest primary actions. Green is an accent/state language rather than a full-page background. No default yellow/green competing action colors. Self-hosted Manrope Variable for headings and DM Sans Variable for body. Spacious desktop composition, stacked phone layouts and deliberate content hierarchy.

The CSS in apps/web/app/globals.css is the implemented token source for this revision. This owner-approved visual change supersedes the earlier sample hex/font decisions in DESIGN.md; product functionality and authorization requirements remain unchanged. Actual foreground/background pairs must pass contrast checks; light decorative lines cannot carry essential information.

## Implemented experiences

- Original generated architectural home image in public/images/energy-home.png, with illustrative energy-reading overlay and a controllable energy-path animation. The home and device visual are explicitly concepts, not photographs of an installed SmartClamp product or actual customer readings.
- Actual interactive, explicitly simulated energy demo: appliances change power/energy estimates; switch changes simulated state; period controls update estimates. No real command or payment request is issued.
- Original clamp concept illustration with restrained motion; selectable system diagram explains wire/device/platform/app; audience tabs show different home/building/meter scenarios.
- Shortened customer-facing copy; technical internals remain in documentation rather than public marketing paragraphs.
- Updated shared public navigation/footer and app shell; functional mobile menu with focus trap/Escape/focus return; role-aware navigation without customer-facing Ops link.
- Redesigned sign-in/signup, role setup cards and supported-role routing; landlord setup intent in query string is honored. Existing token/API integration is retained; this is not an auth-system replacement.
- Redesigned homepage, how-it-works, homeowner/landlord marketing, plans, existing-meter entry, About, FAQs, support and connection help.
- Revised tenant/homeowner overviews use returned API values instead of invented browser fallbacks. Missing observation times and old measurements are marked unconfirmed/stale. Chart with no data shows an empty state, not random bars. Exact values can be expanded when real chart data exists.
- Landlord overview uses returned buildings, removes hard-coded financial totals, and links to a newly implemented create-building form. Form preserves request identity with Idempotency-Key and routes to the existing room-management screen.
- Meter lookup now supports Enter, bounded request timeout, validation, cooldown on429 and distinct provider/network failures. It preserves leading zeros and removes stale result cards when input changes.
- Support form calls the existing endpoint, preserves failed drafts, requires a session and reports the returned reference. Invented phone/WhatsApp contact numbers and nonfunctional attachment control were removed. Attachment upload is explicitly unavailable in this form.
- Prototype control/history/utility/notification examples are labeled. Decorative motion respects prefers-reduced-motion; public demo is separate from authenticated device control.

## Running and validating

From apps/web: `npm ci`, `npm run dev`, `npm run typecheck`, `npm run build`.

Browser tests: install the Playwright Chromium browser with `npx playwright install chromium`, then `npm run test:ui`. By default the test config starts a local dev server on3100. To reuse an already running server, set UI_BASE_URL. On this cloud machine the system browser is selected with PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium. Tests mock selected API responses; they do not prove real providers, payments, authorization or physical hardware work.

Tests cover responsive overflow at320/390/768/1024/1440, no landing hydration exceptions, simulated appliance/period/switch behavior, keyboard tabs and reduced motion, mobile menu focus, meter validation/Enter/leading zeros, returned-role login routing, missing-data dashboard state, landlord intent/create-building flow and automated landing WCAG AA checks.

## Findings beyond the visual work

The auditor's “production-ready” description is not substantiated by the inspected implementation. These are release blockers, not problems solved by applying a new stylesheet:

| Finding | Evidence | Current disposition |
|---|---|---|
| Charts generated random data without being labeled | original components/UsageChart.tsx used Math.random during render | removed; empty chart unless data supplied; prevents hydration mismatch |
| Dashboard data and timestamps fabricated in browser | original tenant/homeowner/landlord pages contained literal balances, forecasts, dates and verification | removed from revised overviews; server-returned values still require real provenance |
| API dashboard/analytics values are hard-coded | apps/api/app/routes/dashboards.py projection_for and analytics handlers | unchanged backend; no live-data claim; must implement real scoped queries |
| SQL connection does not establish route persistence | apps/api/app/__init__.py creates in-process app.stores; buildings.py writes that dictionary | unchanged; durability/restart/concurrency require backend work |
| Relay UI can simulate an applied state using a timer | apps/web/app/control/page.tsx setTimeout; step-up dialog does not verify challenge | explicitly labeled interactive preview; not safe for real device operation |
| Utility figures, history rows and notifications are static examples | dashboard/utility, history and alerts pages | labeled preview; utility no-op action buttons unavailable; source API must be implemented |
| Several other route controls remain placeholders | e.g. original budget/schedule/export/attachment/report demo references | this is a targeted UI revamp, not completion of every backend/device loop; validate each release ticket |
| Create-building navigation led to a missing route | landlord dashboard href /dashboard/landlord/buildings/new had no page | repaired with authenticated API-bound form |
| Support page displayed placeholder phone numbers | original support/page.tsx | removed; no invented contact channel |
| Default development JWT and fallback storage | apps/api/app/__init__.py | production configuration must fail closed; scoped Auth/RLS/provider tests still required |

Do not accept money, operate physical relays, publish “verified” metrology claims, or describe the platform as production-ready on the basis of UI or mocked browser tests. Follow RELEASE-GATES.md and the source domain contracts for the remaining integration work. Full security, SQL and firmware audits were outside this visual change.
