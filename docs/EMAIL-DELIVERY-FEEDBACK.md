# Resend delivery feedback (035)

Register `https://<your-api-origin>/api/v1/webhooks/resend` in the Resend dashboard and set its **endpoint signing secret** as `RESEND_WEBHOOK_SECRET` through secure runtime settings. This is distinct from the REST API key. Subscribe to email.sent, email.delivery_delayed, email.delivered, email.failed, email.suppressed, email.bounced and email.complained. Use this application endpoint for application emails; configuring Supabase SMTP remains a separate task.

The endpoint verifies Svix's HMAC-SHA256 signature over the exact raw body, event ID and attempt timestamp. It requires a five-minute clock tolerance, accepts the supported v1 signature in a rotation header, and rejects modified bodies and stale attempts. Keep the API host clock synchronised. Event IDs deduplicate retries; a reused ID with different content returns 409. Unsupported signed event types have no effect.

Resend requests now carry a random per-dispatch tag, frozen in the submitted provider body. A signed callback can correlate a lost HTTP response using this tag. Only a dispatch pinned to Resend with a recorded first attempt can be matched. The original encrypted recipient must match the event's recipient. A tag/reference conflict or recipient mismatch cannot mark someone else's email delivered. Untagged events are stored as minimal unmatched metadata and reconciled when the original send response supplies its provider reference; this preserves compatibility with older frozen bodies.

A delivery callback can arrive before the worker's HTTP request returns. The callback establishes the provider reference, closes the unknown dispatch, and stops resends. The worker does not overwrite that result with a later transport failure. No callback creates a new provider request, changes routing, or releases a quota reservation.

Dispatch status and delivery feedback are separate. `provider_accepted` records request acceptance/existence. The delivery state records sent, delayed, delivered, failed, suppressed, bounced or complained. Delivered means the recipient's mail server accepted the email; it is not inbox placement, a read receipt, or proof that a person saw it. Negative feedback is sticky: reordered sent/delivered callbacks cannot erase a bounce or complaint. All accepted event metadata remains available for server-side review.

Bounce, complaint and provider-suppression events add an address suppression. Future application emails to that address are held as `recipient_suppressed`, including emails that would otherwise route to OneSignal. Suppression is keyed by an HMAC address hash using the preserved email encryption key; webhook event storage does not retain raw payloads, email addresses, message text or SMTP diagnostic content. A verified different email has its own hash. Opting in again does not bypass a complaint. No automatic suppression removal is provided; investigate with the provider before any reviewed administrative database change.

The operations delivery review includes negative/delayed email feedback even when dispatch was accepted. OneSignal email feedback remains provider-side; this endpoint does not invent Resend signatures for OneSignal. Live webhook delivery, real sender DNS, actual inbox/negative-event acceptance and external OneSignal acceptance still require configured provider accounts.

Official references retrieved over verified HTTPS on 15 November 2026:

- https://resend.com/docs/webhooks/verify-webhooks-requests.md
- https://resend.com/docs/webhooks/emails/delivered.md
- https://resend.com/docs/webhooks/emails/bounced.md
- https://resend.com/docs/dashboard/emails/tags.md
- https://docs.svix.com/receiving/verifying-payloads/how-manual

The verifier is checked against Svix's published independent example signature, as well as actual local HTTP send/callback races, duplicates, changed bodies, recipient mismatch, reordered outcomes and suppression. These are local provider-contract checks, not live Resend delivery acceptance.
