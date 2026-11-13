# Installed app and Web Push

The web app has a standalone manifest, 192/512 PNG icons (including maskable),
Apple web-app metadata and an origin-scoped service worker. Settings offers the
native install prompt when supported, browser-menu/Home Screen instructions,
explicit update activation, and opt-in browser notifications. Neither install nor
notification permission is prompted automatically.

Offline navigation goes to a static public reconnect page. The service worker
caches that page, icons and bounded hashed JS/CSS/fonts only. It never caches
account HTML, API responses, readings, report tokens or checkout pages. It never
queues POSTs, financial actions or device commands. Private navigation/API failure
is not proof of a power outage. Existing session-refresh retry semantics apply.

Migration 025 adds private encrypted browser subscriptions and durable per-device
dispatch records. Authenticated users register/remove their own subscriptions.
Known Chrome/Firefox/Apple push service hosts are allowlisted; arbitrary endpoint
URLs, redirects to other hosts and private-network SSRF are rejected. Each event
first commits its in-app notice, then queues pushes for explicit opt-ins only.
Dispatch commits `unknown` before HTTP and never blindly retries after an unknown
outcome. 404/410 disables an expired subscription. Acceptance means the push
service accepted the encrypted message, not that a phone displayed or read it.
The worker, database, keys and network access must all be running/configured.

Lock screens show a generic account-update message. Event text, phone, property,
device readings and payment amounts remain inside the authenticated app.
Notification clicks open `/alerts`; there are no remotely supplied navigation
URLs. Logout disables this browser subscription and attempts local unsubscribe.
Opt-out cancels queued sends; it cannot recall a notification already dispatched.

## Configuration and external acceptance

- `WEB_PUSH_ENABLED=true`, separate private P-256 `VAPID_PRIVATE_KEY_FILE`, an
  actual monitored `VAPID_SUBJECT` (`mailto:` or HTTPS), and distinct Fernet
  `PUSH_ENCRYPTION_KEY`. Preserve both keys across deployments. Rotating VAPID
  requires users to resubscribe; losing encryption keys prevents decryption.
- `tools/bootstrap_secrets.py` generates private VAPID and encryption material
  for a **new** secrets directory and never overwrites existing keys. Existing
  installations need a reviewed addition/rotation, not regeneration of all keys.
- Mount the private file read-only in the API and worker. Supply the same settings
  to both. Use HTTPS and allow outbound HTTPS to approved browser push services.
  Web Push uses browser infrastructure; there is no invented paid provider account.
- Verify actual Android Chrome, Firefox and installed iOS/iPadOS Safari (supported
  OS versions) for opt-in, receipt while backgrounded, opening a logged-out app,
  opt-out/logout, expiry, key rotation and installed-app updates. An installable
  manifest and local encrypted HTTP fixture do not prove handset delivery.
- Application email event delivery remains unimplemented. Supabase SMTP handles
  identity emails only. SMS uses the separate Africa's Talking adapter and needs
  activated sender/handset acceptance. None of these replaces ESP command/OTA
  delivery; see `FIRMWARE-UPDATES.md` for that signed channel.

Automated tests decrypt an actual RFC8291 library-generated payload at an isolated
HTTP push fixture, verify the ES256 VAPID audience/signature and exercise ownership,
unknown-result suppression, expired subscriptions and opt-out. Browser checks
inspect the real manifest/icons, service-worker activation, public-only Cache
Storage, failed offline account fetch, offline navigation and reconnection.
`apps/web/tools/check-browser-push.mjs` attempts actual browser subscription;
failure to reach browser infrastructure is reported rather than treated as success.

13 November QA browser subscription attempt: Chromium returned **Registration failed - permission denied**, even in the isolated notification-permission test context. No browser subscription/handset receipt success is claimed from that attempt. The encrypted adapter/expiry/opt-out HTTP integration tests passed; live supported-browser receipt remains an acceptance gate.
