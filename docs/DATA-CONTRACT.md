# Data and persistence contract
Normative companion to canonical OpenAPI. OpenAPI's generic Page means a cursor window over the entity below, never SELECT * from private tables. Paginated reads order by (created_at,id), limit1–100 default50, opaque signed cursor bound to actor/filter/expiry. Return allowed fields only. Versioned writes require expected_version; stale version409. Relationship denial returns404 except explicit forbidden role action403. Errors contain code/message/request_id, safe retry_after; never SQL traces or keys.

## Entity vocabulary and minimum fields
| Entity | Required logical fields / rules |
|---|---|
| identity/membership | auth user ID, role, organization/region/building/device scope, invited_by, granted_at, revoked_at; no public self-promotion |
| building | id, owning landlord membership, address private, meter_type, region, timezone, topology_version, setup_state |
| room/occupancy | room building/label; occupancy tenant/start/end; no overlapping active occupancy; transfers close then open atomically |
| device | random id, profile, capabilities, board/firmware/config/key epochs, owner/room/building/topology, install_state, calibration_id; secrets excluded |
| credential | private per-device direction/key epoch/encrypted secret, active/revoked_at; only ingress/signing service can access |
| topology edge | parent device or meter, child, valid_from/to, common_load classification; enforce acyclic, one active measurement parent |
| reading | original signed identity/hash/bytes; measured/received timestamps; clock and calibration quality; interval energy counters; gap ranges; immutable |
| inbox/outbox | unique event identity; lease/attempt/status/next_attempt/error_code; no unbounded silent retries |
| wallet | exactly one device or building or linked meter destination, utility, available/reserved amounts, ledger_version; projection only, journal authoritative |
| ledger/journal | immutable transaction and balanced entries; amount_kobo or energy_mwh, account, direction; source payment/usage/refund unique; reversals explicit |
| quote/payment/vending | quote immutable rate/fee/markup/expiry; payment provider/reference/verified state; vendor request/reference/outcome/token delivery separately; no secrets in response |
| tariff | versioned provider/utility/time bands/rates/rounding/effective dates, margin; prior invoices never rewritten |
| bill | subject scope, period, matched usage, tariff snapshot, itemized fees/credits, amount_kobo, payment evidence/status/version |
| command | command_id, target,key/config/policy epochs, seq, exact signed bytes, requester/reason/authorization_ref, issued/expiry, outbox/receipt/feedback status |
| policy | owner/scope, type(schedule,budget,maintenance,restore), version/timezone/validity, delegated grant and revoked_at; local and server policies versioned |
| consent | actor/device/named utility/capability, disclosure version/accepted_at/revoked_at and policy epoch |
| episode/alert | cause/source/confidence, topology scope, start/end/coverage, dedupe key, status/resolution/false_positive, reviewer; alert not accusation |
| notification | episode/template/recipient/channel unique, safe rendered payload, delivery attempts/provider reference and status |
| dispute/evidence | bill/period/party memberships, immutable snapshot hash and objects, responses/proposal/acceptance and audit; attachment access private |
| report | exact canonical snapshot, SHA256/signature/key_id, source coverage, issued/expiry, hashed public token/revocation; verify stored bytes |
| support/job | scoped owner/reporter/assigned actor/status/SLAs; installation/RMA/collection evidence; one completion payout event |
| subscription | plan/cadence/grace/current entitlement validity; distinct from electricity credit |
| payout | earner/trigger/source reference/amount/status, schedule/disbursement evidence and reversal; never arbitrary wallet update |
| ops | inventory movements not raw stock overwrite; supplier shipment cost; compliance status/expiry; vendor/region notes; finance inputs; staff exports audit |
| feature flag | key/version/global/tier/building/region/organization rollout; decision returned by API for actor context, not recomputed frontend |
| linked integrations | meter model/protocol/capabilities/auth reference; Tuya OAuth credential private; Matter fabric gateway binding; last verified connection |
| organization | name/subdomain/theme with approved constraints; memberships scoped; no cross-org aggregation leak |

## SQL deployment obligations
All above entities require actual versioned migrations before server implementation can be called complete. database/reference/source-schema.txt is not executable. Database schema must constrain identity uniqueness, amount ranges, one owner, immutable history and idempotency at DB level, not only Python code. Query policies must permit authorized read-only Realtime without exposing keys/other occupancies. SQL table names may be normalized/split while preserving logical fields/constraints above; schema changes update both API and projections.

## Events and read models
Domain events include device_commissioned, occupancy_transferred, reading_committed, supply_lost/returned, connectivity_changed, mismatch_opened/resolved, payment_verified, vend_confirmed/failed, credit_released, consumption_posted, command_requested/receipt, consent_revoked, notification_delivery and report_created. Store event schema_version and correlation_id. Transactional workers update projection versions and enqueue notifications; clients refetch on version mismatch. Never rely on in-process callbacks as only side-effect path.

## Required provider interfaces
MeterLookup.validate(number,provider)->valid/masked_identity/unsupported/error. Payment.initiate(quote,key), verify(reference), refund(reference,key), verify_webhook(raw,signature). Vending.purchase(destination,quote,key), status(reference). Sms.send(template,recipient,key), verify_callback. MeterAdapter.read(model,authorization)->metrics+quality; unsupported model is error. Transport.forward(original_envelope), poll, ack; local receive ACK is not durable-cloud ACK. Each interface has fake deterministic test adapter and real provider adapter separately; fake mode prominently labeled and never default in production.

## API compatibility revision2
Retain source contracts as migration/reference only. Legacy /devices/{id}/readings deprecated for new firmware in favor of signed envelope endpoints. New dashboard contract includes independent state axes from ACCESS-MATRIX. Canonical /payments/quotes and /payments/checkout supersede direct raw-amount wallet recharge; old endpoint must call same quote/fulfillment engine or return410 in a clean rebuild. Dispute, viewer revocation, commissioning, payment status and device receipts fill source omissions. CLI code generation consumes only contracts/openapi.yaml after validation. The actual backend still needs implementation, with this contract as its target.
