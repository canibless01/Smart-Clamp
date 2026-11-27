# Responsive layout audit

27 November 2026 (Africa/Lagos). Preserve the approved light forest/sage UI.

## Scope

The automated matrix traverses 78 page states at each of 390x844, 768x900 and 1440x900: public/plan/product pages and homeowner, tenant, landlord, staff, utility and installer workspaces. The paths represent all 64 App Router page entries, with guards, redirects and unavailable-token/not-found states explicitly included. This is not a claim that every populated state of every feature has been accepted.

Real isolated GoTrue/API/PostgreSQL accounts provide signed-in context. Known fixture devices/buildings/jobs/organisations are used for valid detail pages. Callback/profile-completion guest guards, unavailable public payment/report tokens, missing dispute/meeting/ticket/incident/transfer records and missing payment-return parameters exercise their safe initial/error states. Successful onboarding, reports/QR, disputes, support and other populated flows have separate journey tests; their complete per-state visual review remains open.

## Changes

- Native selects and fieldsets can shrink within their container. This fixes observed mobile Business settings overflow.
- Shared form grids and ordinary controls have consistent widths, spacing and existing-brand styling.
- Checkbox/radio rows retain a fixed 20px control beside a wrapping text column; label/link/reference text can wrap within margins.
- Long links and ordinary workspace prose wrap, rather than widening the viewport.
- Adjacent direct workspace cards gain separation without adding margins inside dashboard grids.

No overflow-hiding rule conceals broken content. No navigation, gauges, palette, device states, permissions or provider availability were redesigned.

## Verification boundaries

Tests assert page width and checkbox/control geometry, open disclosures, and load the Business settings editor. A signup screenshot was inspected at 390px. Geometry checks are not a substitute for human review of all content, accessible names, every browser, physical hardware, provider activation or deployment acceptance. The dedicated OneSignal and SMTP environments are separate from the main browser run.

The broader journey run revealed two fixture issues: an aged modem report no longer in the latest-results list, and missing comparison/topology mocks on the old building contract test. The first was rerun with a fresh isolated fixture; the second now mocks the newly loaded endpoints. Authentication guards were preserved. The responsive matrix explicitly waits for the guest profile-completion redirect before inspecting the page.
