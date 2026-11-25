# SmartClamp investor demo — 25 November 2026

This is a separate investor-demo folder. None of its screenshots were added to the earlier 86-image QA gallery. The images are actual browser captures of the new interactive `/demo` route, with the simulated-data banner visible.

## Open and try it

The Next.js frontend serves `/demo`. It needs no Supabase database, API, account, SMS provider or payment keys. Select a workspace, choose a demo tenant identity and supply scenario, then use the navigation. State stays in this browser tab's memory and resets on reload or Reset demo. No production authentication tokens are created and no production API calls are made.

The local server runs on port 3000. This environment currently has SSH only, with no HTTP preview. Add 3000 in Edit Environment → HTTP Previews → Apply to this chat to obtain a private owner preview. The investor-facing address must be the deployed frontend's `/demo` URL; this work does not claim an external public deployment or invent a site address. Normal Next.js frontend hosting is sufficient for the demo; production SQL is not required for this route.

## Correct shared-meter model

Each tenant buys units credited to their own room's SmartClamp, even when the building has one shared central meter. One room's usage does not consume another room's allocation. It is not primarily a landlord-controlled splitting system.

The demo also illustrates an optional **new joint purchase** with explicit allocations across rooms. Allocations must sum exactly to the funded demo purchase, using integer Wh. This is not a transfer of another tenant's existing credit. Production joint-purchase allocation and its consent/accounting rules are not implemented by this demonstration.

Landlord mode shows room power and usage, not tenant credit balances or supply controls. The tenant-identity selector switches between fictional demo personas; it is not a permission model for access to real tenants.

## Why the request code existed

Production remote control currently requires an operation-bound, short-lived SMS step-up confirmation. A saved browser login may remain open on an unattended/shared device, and a physical switching action has more consequence than viewing measurements. The code proves a second confirmation and prevents reuse for a different device/action. It is not a meter number or unit-sharing code.

This investor demo uses direct Turn on/Turn off buttons with no SMS because it controls only simulated state. Production SMS requirements have **not** been silently removed. A future recent-authentication/trusted-session alternative should preserve device/action scope, expiry, ownership, replay resistance, independent restrictions and physical feedback before replacing that policy.

## Scenarios to demonstrate

1. Tenant → Overview: supply available, 230 V, measured current and real power, room credit, usage chart.
2. Supply scenario → No electricity supply: voltage/power fall to zero, while grid status and relay position remain separate.
3. Low or high voltage: visible warning and simulated protection. Returning voltage to normal does not automatically turn the relay back on.
4. Offline: readings and supply are unknown, rather than falsely reporting an outage; simulated commands are rejected.
5. Landlord → Rooms & usage: three rooms, separate current power and daily energy, without tenant spending/control privileges.
6. Tenant → Buy electricity: a normal purchase changes only the selected tenant's balance. Try optional joint-purchase allocation, including a deliberately incorrect total.
7. Power control: direct simulated switching, with protection/zero-credit restrictions preserved. Turning a relay on during an outage does not restore the grid.

Demo voltage warning limits 180–250 V and example tariff ₦100/kWh are explicitly illustrative, not approved production safety settings or actual commercial pricing. The demo does not identify individual appliances from aggregate clamp data.

## Real application improvements included

- Homeowner/resident dashboards now expose signed-reading voltage(V) and current(A), alongside real power(W). Missing/stale observations remain distinguishable from current measurements.
- Optional `VOLTAGE_WARNING_LOW_MV`/`VOLTAGE_WARNING_HIGH_MV` configure **display-only** voltage advisories. No default hardware thresholds are installed. Limits must be reviewed for the installation; this display does not issue commands or confirm physical protection.
- Landlord room records now expose scoped per-room supply, electrical measurements and recorded measured daily consumption in Lagos time. Unavailable intervals are not reported as zero consumption; private tenant wallets are excluded.
- Production control confirmation, actual payment/ledger processing, Auth guards and physical qualification requirements remain intact.

Low current alone is not evidence of bad voltage: a room may simply have little load. Low/high voltage warnings must be based on voltage observations and reviewed limits.

## Screenshots

[Open the separate visual index](gallery.html) · [Download screenshot pack](smartclamp-investor-demo-screenshots.zip)

- [Supply present, voltage, current, real power and independent room credit](screenshots/01-monitoring.jpg)
- [Electricity absent: grid supply and relay position are different](screenshots/02-no-supply.jpg)
- [Low-voltage warning with simulated protection](screenshots/03-low-voltage.jpg)
- [High-voltage warning with simulated protection](screenshots/04-high-voltage.jpg)
- [Landlord monitoring of three rooms; no tenant wallet spending or switching authority](screenshots/05-room-monitoring.jpg)
- [An individual tenant purchase credits only that tenant’s SmartClamp](screenshots/06-tenant-purchase.jpg)
- [Optional joint-purchase allocation concept; production flow not implemented](screenshots/07-joint-purchase-concept.jpg)
- [Direct simulated power control with no SMS and no real hardware](screenshots/08-power-control.jpg)
- [Phone-sized investor walkthrough](screenshots/09-monitoring-mobile.jpg)

## Validation

The production web build and 60 real local API integration tests pass. Three new production-browser demo tests pass: independent room purchases and balanced joint allocation; offline/protection/manual-restore behavior without production API calls or tokens; WCAG AA checks and phone-width layout. All 35 production-browser regression checks pass, including the three new demo checks. Screenshots are captured from the running demo, not generated images. No production SQL or hardware commands were sent.
