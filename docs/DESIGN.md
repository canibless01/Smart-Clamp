# Design specification (proposed exact tokens)
Sources specify navy, amber, green, soft red, off-white; exact values below are design decisions for this foundation.

| Token | Value | Use |
|---|---|---|
| navy | #102A43 | navigation, headings, primary action |
| canvas | #F7F9FC | page background |
| surface | #FFFFFF | readable cards |
| text | #172B4D | body text |
| muted | #526477 | secondary text |
| amber | #F4B544 | premium accent; dark text only |
| green | #176B46 | verified/success with text label |
| red | #B33A48 | risk/errors with icon and label |
| border | #CBD5E1 | boundaries |

Use a system sans stack initially, no required external fonts. Body 16px/1.5; mobile h1 36px, desktop h1 56px; h2 28/36px. Content width 1200px, reading width 720px. Spacing scale 4,8,12,16,24,32,48,64,96px. Cards radius 16px; inputs 10px; touch targets at least 44×44px. Focus ring 3px with offset; verify WCAG AA contrast for every final combination.

## Layout
320–599px: one column, 16px gutters, collapsed public nav, bottom app nav (Home/History/Community/Settings) with safe-area padding; actions wrap without horizontal page scroll. 600–1023px: two columns where useful, 24px gutters, collapsible app rail. 1024px+: persistent 240px app sidebar, 32px gutters, 12-column grid, data/detail split. Device and property switchers stay visible in header. Pricing stacks on phones, becomes comparison columns on desktop. Tables have labeled card equivalents on mobile; evidence tables may scroll inside their own region. Charts have textual summaries and downloadable data.

## Motion
Public navbar solidifies on scroll; optional hero slider advances at 8 seconds with pause/previous/next controls and no announcements on every tick. Hero fade 240ms/12px on first entry; section reveal 200ms once. Hover elevation 120ms; toggles 160ms only after state confirmation. Dashboard values update without shifting card sizes; freshness timestamp travels with every live value. Demo ticks are labeled simulated. No autoplay sound, no flashing, no continuous scroll hijack. prefers-reduced-motion disables auto-advance, counters, transforms and smooth scrolling. Never animate an unacknowledged relay into a confirmed ON state.

## Shared component contract
AppShell, PublicShell, RoleGuard, FeatureGate, PropertyPicker, DevicePicker, MeterLookup, LiveMetric (value/unit/source/observed_at/quality), UsageChart (time-zone/range/accessible table), WalletCard, PaymentStatus, CommandStatus, StepUpDialog, EvidenceTimeline, StatusBadge, EmptyState, ErrorPanel, OfflineBanner and AuditEntry.

Forms: persistent labels, field-specific errors, disabled duplicate submit while pending, server error preserves input, retry only safe operations. Distinguish unauthenticated, forbidden, empty, loading, unsupported capability, offline, stale, and server unavailable. Feature flags can hide UI, but API permissions and physical capabilities must independently enforce every action. Alerts use factual language: suspected mismatch, not theft conviction.

## Privacy and accessibility
Keyboard and screen-reader complete; focus trapped/restored for dialogs, skip link, semantic headings, live region for form results. No color-only state. No graphs without units/ranges and accessible values. Format ₦ and Africa/Lagos display time while storing UTC. Report exports print on white. Do not include addresses/phones in public device views. Anonymous meter results require rate limits and provider-approved masking. Token-bearing report pages are noindex, no-store and use Referrer-Policy: no-referrer.
