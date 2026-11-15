# Private support workflow

Customers open a persisted request at `/support`, review their paginated requests at `/support/requests`, and reply in the private thread. Internal support and superadmin roles see the support queue. Other roles only see their own requests; a former support assignee loses staff access when their role is revoked; unknown/out-of-scope IDs return 404.

A support colleague claims an unassigned case before marking it waiting for the customer, waiting for a provider, or resolved. Claiming an already assigned case is rejected. Every workflow action requires the current numeric version and a customer-visible note. Updates and replies lock the ticket row, and stale workflow updates return 409. Idempotency keys safely replay successful actions without duplicate notes. Resolving saves the actual resolution timestamp; the reporter or support staff can reopen with a reason, clearing that timestamp. Resolved threads reject replies until reopened.

Replies and workflow changes notify the other participant (reporter or assigned colleague), with generic text that does not copy private case content into email, SMS or push previews. In-app records are committed transactionally; external channels use existing opt-in/provider outboxes. This does not prove delivery by a live provider. New unassigned cases appear in the support queue; no arbitrary on-call recipient or SLA is invented.

Migration 033 adds optimistic versions and the queue index. The workflow records customer-visible notes and existing immutable audit entries. It does not authorize payments/refunds, change bills, or certify hardware. Financial dispute decisions, formal escalation/SLA policy, and real provider acceptance remain separate work.

## Staff handoff

An internal superadmin can assign an open request to an onboarded internal-support colleague or another superadmin. The detail view provides up to 500 eligible names/opaque IDs; customer and non-admin responses return no roster. A staff member can release their own request to the queue, and a superadmin can release any assignment. Release returns support status to open. Closed requests must first be reopened. Each handoff checks the current version, records previous/new assignee in audit, adds the visible review note, and notifies currently authorised affected staff. A revoked colleague receives no new handoff notice. Reassignment never grants a public role staff access.
