# Private bill dispute review

A customer selects an existing issued bill at `/disputes`, adds a concern, and opens a persisted case. The picker lists the most recent eligible bills; missing bills go through support. This does not generate bills. Tenant bills must fall wholly within an actual occupancy period; a new resident cannot inspect or dispute a prior resident's device bill. Building bills remain scoped to the building owner.

Cases freeze the original bill record, amount, period, initial concern and evidence hash. Migration 034 rejects changes to those source fields. This snapshot is not a metrology report or proof of a provider charge. It does not invent a reading timeline where bill issuance has not recorded one.

Internal finance and superadmin roles have a paginated review queue. A reviewer claims a case before responding or closing it without adjustment. Another reviewer cannot take over that claim. The reporter or a current reviewer can escalate an open/responded case or reopen a case closed without adjustment. A newer active case for the same reporter and bill prevents reopening the older case. A per-bill/reporter advisory lock prevents duplicate active case creation through the API.

Workflow actions require a current numeric version and a visible note. Stale changes fail with 409. Request idempotency prevents duplicate action notes on a replay. Replies and actions serialize on the case row. Closed cases reject replies until reopened. Assigned staff who lose their finance role lose reviewer access; the reporter retains their own case history.

`/disputes/{id}` shows the discussion and recorded decisions. `/disputes/{id}/meeting` remains read-only and displays the same snapshot and discussion. Decision records retain escalation/closure notes. Generic notifications go to the other participant through the existing transactional in-app and opt-in external-channel paths, without copying private financial content into notification previews. Unassigned cases appear in the queue; no arbitrary staff on-call list is assumed.

Closing without adjustment does not edit bills, wallet entries, payments, credit, debt or relay state. Monetary proposals, independently approved balanced reversals/refunds, attachments, reviewer reassignment policy and live provider acceptance remain separate implementation/acceptance work. This workflow does not claim those are finished.
