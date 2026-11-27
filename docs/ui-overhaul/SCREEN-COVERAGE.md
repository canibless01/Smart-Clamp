# Screen coverage

26 November 2026. Baseline `5af008a`. Shared presentation changes are distinguished from bespoke redesigns. This is not a claim that every A-to-Z feature is implemented.

| Screen | Treatment | Untouched content / reason |
|---|---|---|
| `/about` | Retained public shell | Page-specific content retained to preserve the approved design; shared responsive shell fixes apply. |
| `/account/complete-profile` | Direct component/page change | See the file diff; shared shells and tokens also apply. |
| `/account/recovery` | Retained public shell | Page-specific content retained to preserve the approved design; shared responsive shell fixes apply. |
| `/admin/organizations/[id]` | Shared unavailable-state presentation | Feature remains gated because its end-to-end execution is incomplete; no fabricated action. |
| `/alerts` | Direct component/page change | See the file diff; shared shells and tokens also apply. |
| `/auth/callback` | Retained public shell | Page-specific content retained to preserve the approved design; shared responsive shell fixes apply. |
| `/billing` | Direct component/page change | See the file diff; shared shells and tokens also apply. |
| `/communications` | Direct component/page change | See the file diff; shared shells and tokens also apply. |
| `/community` | Shared unavailable-state presentation | Feature remains gated because its end-to-end execution is incomplete; no fabricated action. |
| `/connection-help` | Retained public shell | Page-specific content retained to preserve the approved design; shared responsive shell fixes apply. |
| `/control` | Direct component/page change | See the file diff; shared shells and tokens also apply. |
| `/d/[public_token]` | Retained public shell | Page-specific content retained to preserve the approved design; shared responsive shell fixes apply. |
| `/dashboard/homeowner` | Shared specialised component | Route entry delegates to the shared dashboard or auth component. |
| `/dashboard/landlord/buildings/[id]/rooms` | Direct component/page change | See the file diff; shared shells and tokens also apply. |
| `/dashboard/landlord/buildings/new` | Shared workspace shell | Existing page-specific content retained; shared grid, navigation, sound and tokens change. |
| `/dashboard/landlord` | Direct component/page change | See the file diff; shared shells and tokens also apply. |
| `/dashboard/properties` | Delegated route | Reuses landlord page. |
| `/dashboard/tenant` | Shared specialised component | Route entry delegates to the shared dashboard or auth component. |
| `/dashboard/utility` | Shared workspace/grid/table treatment | Existing data/actions preserved; shared shell, live context and mobile table behaviour apply. Bespoke instrument replacement remains incomplete. |
| `/demo` | Shared demo component | Delegates to the approved light isolated walkthrough. |
| `/devices/[id]/commands` | Shared workspace/grid/table treatment | Existing data/actions preserved; shared shell, live context and mobile table behaviour apply. Bespoke instrument replacement remains incomplete. |
| `/devices/[id]` | Direct component/page change | See the file diff; shared shells and tokens also apply. |
| `/devices/link` | Shared workspace shell | Existing page-specific content retained; shared grid, navigation, sound and tokens change. |
| `/disputes/[id]/meeting` | Shared workspace/grid/table treatment | Existing data/actions preserved; shared shell, live context and mobile table behaviour apply. Bespoke instrument replacement remains incomplete. |
| `/disputes/[id]` | Shared workspace/grid/table treatment | Existing data/actions preserved; shared shell, live context and mobile table behaviour apply. Bespoke instrument replacement remains incomplete. |
| `/disputes` | Shared workspace/grid/table treatment | Existing data/actions preserved; shared shell, live context and mobile table behaviour apply. Bespoke instrument replacement remains incomplete. |
| `/faqs` | Retained public shell | Page-specific content retained to preserve the approved design; shared responsive shell fixes apply. |
| `/for-homeowners` | Retained AudiencePage and public shell | Audience content retained to preserve the approved public design. |
| `/for-landlords` | Retained AudiencePage and public shell | Audience content retained to preserve the approved public design. |
| `/history` | Shared workspace/grid/table treatment | Existing data/actions preserved; shared shell, live context and mobile table behaviour apply. Bespoke instrument replacement remains incomplete. |
| `/how-it-works` | Retained public shell | Page-specific content retained to preserve the approved design; shared responsive shell fixes apply. |
| `/install` | Retained public shell | Page-specific content retained to preserve the approved design; shared responsive shell fixes apply. |
| `/ir-reader/setup` | Retained public shell | Page-specific content retained to preserve the approved design; shared responsive shell fixes apply. |
| `/join` | Retained public shell | Page-specific content retained to preserve the approved design; shared responsive shell fixes apply. |
| `/login` | Shared specialised component | Route entry delegates to the shared dashboard or auth component. |
| `/meters/link` | Shared workspace shell | Existing page-specific content retained; shared grid, navigation, sound and tokens change. |
| `/ops/firmware` | Shared workspace/grid/table treatment | Existing data/actions preserved; shared shell, live context and mobile table behaviour apply. Bespoke instrument replacement remains incomplete. |
| `/ops/incidents/[id]` | Shared unavailable-state presentation | Feature remains gated because its end-to-end execution is incomplete; no fabricated action. |
| `/ops` | Direct component/page change | See the file diff; shared shells and tokens also apply. |
| `/orders` | Shared workspace/grid/table treatment | Existing data/actions preserved; shared shell, live context and mobile table behaviour apply. Bespoke instrument replacement remains incomplete. |
| `/` | Direct component/page change | See the file diff; shared shells and tokens also apply. |
| `/payments/return` | Retained public shell | Page-specific content retained to preserve the approved design; shared responsive shell fixes apply. |
| `/payments/transfer/[quote_id]` | Shared unavailable-state presentation | Feature remains gated because its end-to-end execution is incomplete; no fabricated action. |
| `/plans/[slug]` | Retained public shell | Page-specific content retained to preserve the approved design; shared responsive shell fixes apply. |
| `/portal/jobs/[id]` | Shared workspace/grid/table treatment | Existing data/actions preserved; shared shell, live context and mobile table behaviour apply. Bespoke instrument replacement remains incomplete. |
| `/portal` | Shared workspace/grid/table treatment | Existing data/actions preserved; shared shell, live context and mobile table behaviour apply. Bespoke instrument replacement remains incomplete. |
| `/pricing` | Retained public shell | Page-specific content retained to preserve the approved design; shared responsive shell fixes apply. |
| `/privacy` | Retained public shell | Page-specific content retained to preserve the approved design; shared responsive shell fixes apply. |
| `/products/[slug]` | Retained public shell | Page-specific content retained to preserve the approved design; shared responsive shell fixes apply. |
| `/reports` | Shared workspace/grid/table treatment | Existing data/actions preserved; shared shell, live context and mobile table behaviour apply. Bespoke instrument replacement remains incomplete. |
| `/settings` | Direct component/page change | See the file diff; shared shells and tokens also apply. |
| `/settings/smart-devices` | Shared unavailable-state presentation | Feature remains gated because its end-to-end execution is incomplete; no fabricated action. |
| `/settings/subscription` | Shared workspace/grid/table treatment | Existing data/actions preserved; shared shell, live context and mobile table behaviour apply. Bespoke instrument replacement remains incomplete. |
| `/settings/utility-control` | Shared unavailable-state presentation | Feature remains gated because its end-to-end execution is incomplete; no fabricated action. |
| `/signup` | Shared specialised component | Route entry delegates to the shared dashboard or auth component. |
| `/smart-meter` | Retained public shell | Page-specific content retained to preserve the approved design; shared responsive shell fixes apply. |
| `/support` | Direct component/page change | See the file diff; shared shells and tokens also apply. |
| `/support/requests` | Shared workspace/grid/table treatment | Existing data/actions preserved; shared shell, live context and mobile table behaviour apply. Bespoke instrument replacement remains incomplete. |
| `/support/tickets/[id]` | Shared workspace/grid/table treatment | Existing data/actions preserved; shared shell, live context and mobile table behaviour apply. Bespoke instrument replacement remains incomplete. |
| `/terms` | Direct component/page change | See the file diff; shared shells and tokens also apply. |
| `/utilities` | Direct component/page change | See the file diff; shared shells and tokens also apply. |
| `/verification-reports/[token]` | Retained public shell | Page-specific content retained to preserve the approved design; shared responsive shell fixes apply. |

Follow-up: `/settings` adds device/access discovery; `/devices/[id]` adds family and guest management; `/history` adds sampled supply hours with coverage and equal-period comparison. Other page-specific content is retained to preserve the approved UI and avoid another visual redesign.

Signal investigation follow-up: `/devices/[id]` adds Signals & trust; `/support/tickets/[id]` adds source evidence and claimed inspection handoff; `/dashboard/utility` adds scoped review actions and packet references. Other screen content remains as recorded above.

Operations follow-up: `/ops` adds sourced onboarding, profile, command/queue and cellular usage views. Shared shells/branding remain unchanged; unmodified screens retain their prior functionality and the reasons above.

Report follow-up: `/reports` and shared `/verification-reports/[token]` gain print/PDF and signed-evidence download. Private freshly issued reports can show a locally generated sharing QR. Existing scope, expiry, revocation and qualification wording are preserved.
