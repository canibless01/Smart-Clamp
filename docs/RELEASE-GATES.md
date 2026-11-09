# Release and acceptance gates
The handoff is actionable without attachments; production release is not implied. Record command, environment, date, revision and actual result for each gate. Never mark a gate passed because a document describes it.

1. Contract: validate canonical OpenAPI; unique operation IDs, no unresolved refs; shared golden HMAC/event/command vectors verify on server and ESP32. Unknown fields/version, invalid signature, replay, wrong target, expired command, stale key rejected.
2. SQL: apply clean schema and upgrade, RLS isolation tests for all roles, service-role API checks, signed/private storage, consent revocation, immutable occupancy and audit; schema drift CI.
3. Money: concurrent duplicate/out-of-order webhook, failed vendor after payment, lost callback, partial refund, chargeback, uncertain payment status, idempotency hash conflict, concurrent wallet debits; balanced ledger and no double credits/vends.
4. Telemetry: dropped/reordered frames, queue full, corrupt journal tail, ACK loss, clock reset, cumulative counter reset, incomplete topology, backfill and source switching. No duplicated consumption and no fabricated verified windows.
5. Control: overlapping schedule/manual/budget/wallet/voltage/utility reasons; no ON until all clear; revoked consent dispatch; physical feedback mismatch; relay pulse watchdog; latching state on power return; no unsafe protection override.
6. Hardware: actual board/pins/ADC range, isolated CT/voltage calibration, waveform phase, rated load/coil driver/feedback, brownout/surge/temperature, supercap hold-up, modem power/coverage/TLS, RS485 interference and ESP-NOW range. None replaced by host tests.
7. UX: all48 screens incl gated roadmap specs;320/768/1440 widths; zoom200%; keyboard/screen reader/reduced motion; slow/offline/error states; real user roles and scoped Realtime reconnect. Disabled provider is explicit.
8. Operations: payment reconciliation report, undelivered notification queue, outage/tamper false positives, support ownership, backup restoration, signed OTA canary/rollback, key rotation/revocation, decommission and RMA.
9. External: utility aggregator vending contract, payment live account, SMS/USSD contract, SIM coverage, pole permissions, actual meter support and legal review. No secret values in Git.

Simulation is sufficient to start implementation, not to advertise metering accuracy, universal compatibility, certified protection, financial compliance or deployment readiness. Website build remains separate from this documentation/firmware request.
