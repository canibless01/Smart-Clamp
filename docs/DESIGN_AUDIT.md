# Instrument design audit

## Before the A-to-Z attachment (26 November 2026)

The ongoing first pass has real-data bento infrastructure and four passing dashboard browser checks at 390x844, 768x900 and 1440x900, including no vertical scroll and no serious/critical axe findings on that contract fixture. This is not the final acceptance of the new attachment.

New requirements reveal these violations: voltage/current/power still share an arc shape; channel accents are not distinct; legacy CSS has raw colours and font sizes; UI contains Unicode arrows/checkmarks/symbols; production gauge ranges are not profile-supplied; no-relay navigation/control tiles need capability gating; the public demo remains a long dashboard; not all expanded event types have end-to-end sources; browser updates still poll. The attached request also expands backend, firmware and product scope beyond the current UI task.

## In-progress verification

- Production Next build: passes through the compact dashboard and shared shell/notification batch.
- PostgreSQL/GoTrue integration: 65 unique checks pass before the latest low-credit crossing addition (rerun in progress).
- Compact primary dashboard: fits all three requested widths; instrument drawer uses native modal focus management.
- Audio: off by default, created/resumed on a user tap; visual/text alerts independent of audio.
- Relay: request target is neutral; observation changes require signed feedback. Public QA uses explicit labelled feedback injection, no timer confirmation.
- Acknowledgement and snooze retain delivery status and enforce recipient ownership.
- New attachment's automated identity/shape/token/no-symbol checks: not yet clean. Implementation continues; do not treat this ledger as a pass.
