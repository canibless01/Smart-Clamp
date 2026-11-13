# Dashboard review gallery

These are actual production-build browser captures, 13 November 2026. Sign-in
uses isolated local GoTrue and PostgreSQL. Device history is signed simulated
telemetry processed by the real ingestion/worker pipeline; wallet credit follows
the local payment-provider fixture, vending and explicit token-entry attestation.
No live merchant, physical relay, utility partnership or production hardware is
represented. Each image carries a QA notice added by the capture tool only.

| Implemented workspace | Capture |
| --- | --- |
| Homeowner overview | [Desktop](homeowner-overview.jpg) · [Mobile](homeowner-overview-mobile.jpg) |
| Homeowner device control | [Control](homeowner-control.jpg) |
| Homeowner wallet | [Desktop](homeowner-wallet.jpg) · [Mobile](homeowner-wallet-mobile.jpg) |
| Homeowner measured history | [History](homeowner-history.jpg) |
| Landlord buildings | [Overview](landlord-overview.jpg) · [Rooms](landlord-rooms.jpg) |
| Resident | [Overview](resident-overview.jpg) |
| Operations | [Overview](operations-overview.jpg) |
| Engineering | [Firmware workspace](engineering-firmware.jpg) |
| Installer | [Assignments](installer-assignments.jpg) · [Work order](installer-work-order.jpg) |
| Utility organization | [Scoped overview](utility-overview.jpg) |

Control lives in the sidebar and five-item mobile navigation. Overview shows
measurements and reported supply/relay state; History exposes readings. A relay
without a signed physical observation remains **unconfirmed**, even with sample
energy data. The firmware workspace in this gallery is unconfigured; the separate
browser integration test covers signing a real compiled binary and queuing a
canary. Neither capture nor upload proves an actual healthy ESP32 boot.

Finance/support do not yet have dedicated complete staff panels; the full A–M
organization specification is not implemented. No invented screenshots are
provided for those panels. Operations uses the shared isolated QA fleet, which
also includes integration-test devices. Resident history starts at occupancy,
so a newly joined room correctly has very little history.

To reproduce, start `tools/qa_services.py` with a private `/tmp` configuration,
then run from the repository root:

```sh
SMARTCLAMP_QA_CONFIG=/tmp/smartclamp-qa.json .venv/bin/python tools/dashboard_gallery.py --fixture /tmp/smartclamp-gallery.json
```

Run the production web build/server pointing to the local QA API. In a second
terminal, from `apps/web`:

```sh
SMARTCLAMP_GALLERY_FIXTURE=/tmp/smartclamp-gallery.json node tools/capture-gallery.mjs
```

Set `PLAYWRIGHT_BROWSERS_PATH` if browsers are installed in a custom location.
The fixture contains credentials, is mode 600 and must never be committed. Never
deploy either runner or isolated-auth auto-confirm settings.
