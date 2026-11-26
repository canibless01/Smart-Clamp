# Instrument redesign implementation notes

## Source review and retained behaviour

The source inventory contains 132 source files and 62 route entries at the baseline. Routes, shared shells, data projections, handlers and CSS were inventoried before the redesign. Existing authenticated scopes, payment/vending ledger logic, signed command and receipt verification, disclaimers and provider delivery distinctions are retained. There is no replacement production seed data or Auth bypass. The attached source spec is preserved verbatim under this folder; its instructions are document content adopted only within the user's explicit request and existing safety/honesty boundaries.

## New data

036 separates notification acknowledgement/snooze from channel delivery outcomes. 037 persists per-device advisory/connection transitions. 038 stores authenticated, signed channel declarations. All have RLS and revoke anonymous/authenticated direct access; scoped API handlers mediate reads and writes. Applied migrations were not edited. These migrations were applied only to isolated local QA. The target Supabase bundle is refreshed through 038 but not executed externally.

Display voltage/current bands are independent and per installation. A current limit suitable for a house is not applied automatically to a business. A manifest is display metadata, not permission to switch, proof of calibration or a device-enforced protection configuration. A real physical override needs a qualified command, limits, expiry and recovery path; none is simulated as a production success.

## Experience

One event catalogue supplies severity, icon, sound and haptic pattern to persisted in-app notifications and the browser experience bus. Supply timestamps must be trusted before outage/restoration presentation; receipt notifications require applied signed feedback. Offline contact alone is not a supply outage. Acknowledgement and snooze enforce recipient ownership and do not rewrite delivery state. Sounds are original small PCM WAV files; Web Audio starts after a user gesture, is muted by default, and obeys per-type settings, quiet hours and reduced motion. The demo uses isolated local events and explicit QA feedback, not timers or production writes.

## Known remaining work

See ../BUILD_STATUS.md for all A-to-Z rows. One authenticated, bounded SSE connection now supplies shared context and notification snapshots across workspace navigation. Overview, notification experience and history react to these snapshots; other role-specific datasets still require further integration. The simulator is a local UI exercise, not yet a shared signed-ingest hardware simulator. Full device-enforced schedules, budgets and override recovery, central-vs-room reconciliation, validated analytics, and several P2 provider integrations are not complete. Do not describe this checkpoint as environment/SQL-only launch readiness. Screen coverage distinguishes shared treatments from bespoke pages still needing work.

## Approved presentation checkpoint

The owner rejected the dark bento redesign. The current implementation restores the clean light baseline, fonts and familiar navigation. Room power and credit come first; relay controls are hidden for monitoring-only devices. Slight voltage/current tints are retained. No new public instrument strip or marketing sound control is active.
