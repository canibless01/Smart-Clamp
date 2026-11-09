# Website loading, offline and recovery behavior
The UI is a view of independent facts: browser connectivity, API/provider health, device transport freshness, grid supply, physical relay and payment fulfillment. Never collapse these to a generic red “offline” label. Online browser status is a hint; successful API response and freshness are evidence. Read alongside every page specification.

## Browser request lifecycle
Idle → loading → success/empty/validation_error/forbidden/not_found/provider_unavailable. Initial authenticated fetch may render public shell but no unverified private state. Skeletons appear immediately with fixed dimensions and aria-busy; no loading forever. After10s show “Taking longer than expected” plus safe retry/status check; request timeout30s (lookup provider can have smaller server timeout). Retry reads max3 with jitter, then show error. Financial/control timeout means outcome_unknown: query using original operation ID/idempotency key; never resubmit with a fresh key and claim failure.

Background refetch keeps last-known values with observed_at and “Updating…”; error preserves them labeled stale. No data yet shows unavailable/“—”, never zero. Prevent overlapping fetch race by request generation/version; late old response cannot overwrite a newer device/context selection. Cancel old read when switching property, but do not cancel domain processing of a submitted payment/control merely because user navigates.

## Three different offline conditions
| Condition | Message | Actions |
|---|---|---|
| browser has no working API path | “You’re offline or cannot reach SmartClamp. Last synced {time}.” | show already-loaded snapshot; refresh/reconnect help; control/payment/role changes disabled |
| browser online, device stale | “Device last reported {time}. Live usage and power state are unconfirmed.” | history/report may work; action status remains pending until qualified device ACK; no promise of immediate control |
| source supply lost | “Supply interruption detected {time/confidence}. Connectivity may also be unavailable.” | retain billing/history/support; no automatic control request; restoration/protection explained |

Browser offline and device offline can coexist. API503 != browser offline; show service unavailable. Provider503 may affect only meter lookup/recharge, not rest of dashboard. Account401 attempts one refresh then explicit sign-in preserving safe return path;403 does not retry as another role. User cannot enter a privileged route offline using cached role as authorization.

## Offline data policy
Default: authenticated snapshots only in current tab memory, cleared on logout, role/context transfer, consent/viewer revocation and session expiry. Public shell/assets may be cached; no service-worker caching of authenticated APIs, report tokens, payment data or private evidence by default. Full persistent offline history is a future explicitly encrypted, opt-in device feature; do not silently expose household data on shared phones. Reload offline with no in-memory snapshot shows an honest offline shell and reconnect button. Authenticated mutations are never queued by browser service worker, especially money, role, consent or relay operations. Draft dispute text may be held in current session memory and clearly labeled unsent; confidential attachments remain unsubmitted until confirmed upload.

## Per-function states
- Lookup: invalid syntax inline; unsupported provider vs genuine not-found distinct; mask identity; repeated checks rate-limited with visible countdown. No invented cached success.
- Sign up/login: pending submit disabled; no account enumeration; preserve safe form fields, never persist password in cache. Recovery confirmation generic. If new session created but profile provisioning failed, show finishing_setup with resumable server operation.
- Dashboard: initial skeleton; empty “Waiting for first reading”; uncalibrated device says commissioning, not live0W; graph gaps visible; freshness for each source, not one page-wide time. Source selector changes lineage/quality.
- Recharge: quote loading/expired; checkout pending; return verifying; payment paid_pending_vend; token_pending_entry; available; failed; refund_pending/refunded; outcome_unknown. Give reference and “Do not pay again while we reconcile” when charged outcome uncertain. Refresh polls status, not another charge.
- Control: request/step-up/pending_delivery/applied/rejected/expired/uncertain. Button label indicates requested target; observed switch position changes only after feedback ACK. ON rejected if any other OFF reason; show safe reason. Display command activity link on uncertainty.
- Schedule/budget: server validation preserves draft; operation-bound step-up; saved policy version returned; conflict409 offers reload/review, not silent overwrite. Offline commands not queued.
- Install/order: waiting_hardware/assigned/provisioning/diagnostic_failed/awaiting_online/commissioned; no “complete” after merely saving device ID. Browser without BLE support explains installer companion path.
- Dispute/support: draft/uploading/submitting/received/waiting_response/resolved/reopened; failed upload shows per-file retry; no resolution from notification delivery alone. Evidence download permission checked each time.
- Report/export: queued/generating/ready/failed/expired/revoked; retry only original job; PDF/CSV download private with short TTL. No indexable private report token.
- Utility: no regional contract/consent means explicit restricted empty state. Aggregate incomplete-source warning; broadcast preview confirms audience count; no control hidden in bill/report action.
- Ops: per-panel errors isolated; failed finance provider doesn't hide fleet status. Feature-flag edit requires current version and audit; export time/data coverage recorded.

## Reconnection
On API connection return, validate session/context, refetch snapshots, reconcile outstanding mutation IDs, refresh active flags/grants, then subscribe. Do not replay offline mutations or stale schedules. Show brief nonintrusive “Updated at {time}” only after response, not merely browser online event. Reset subscriptions on context change; token and occupancy revocation invalidates private streams.

## Responsive and accessible details
Desktop sidebar, tablet rail and mobile bottom navigation use same role-authorized route registry. App loading feedback stays near affected action and announced once via polite live region; critical failure has focused summary after submission. Dialogs trap/restore focus; offline banners do not repeatedly steal focus. Progress label has text, not just spinner/color. Reduce-motion stops animated skeleton shimmer and demo counters. Form input remains usable at200% zoom/320px width.
