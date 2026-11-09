# Page inventory

31 source inventory entries plus 17 explicit supporting screens (48 specifications total). Routes are proposed; IDs match master section 13 where present. Shared behavior in ../DESIGN.md applies to every page. All API paths in this document are relative to /api/v1; uploaded API definitions may require correction before code generation.

| ID | Page | Route | Phase |
|---|---|---|---|
| [1](1.md) | Home | `/` | 0 |
| [2](2.md) | How It Works | `/how-it-works` | 0 |
| [3](3.md) | For Landlords | `/for-landlords` | 0 |
| [4](4.md) | For Homeowners | `/for-homeowners` | 0 |
| [5](5.md) | Already Have a Smart Meter | `/smart-meter` | 0/1 |
| [5b](5b.md) | IR-Reader Order and Setup | `/ir-reader/setup` | 1 |
| [6](6.md) | Pricing | `/pricing` | 0 |
| [7](7.md) | Sign Up | `/signup` | 0 |
| [8](8.md) | Log In | `/login` | 0 |
| [9](9.md) | Tenant Dashboard | `/dashboard/tenant` | 0→1 |
| [10](10.md) | Landlord Dashboard | `/dashboard/landlord` | 0→1 |
| [11](11.md) | Homeowner Dashboard | `/dashboard/homeowner` | 0→1 |
| [12](12.md) | Device Pairing and Install | `/install` | 0→1 |
| [13](13.md) | Public Device View | `/d/[public_token]` | 0 |
| [14](14.md) | Dispute Center | `/disputes` | 1 |
| [15](15.md) | Settings and Account | `/settings` | 0→1 |
| [16](16.md) | Installer Agent Referrer Portal | `/portal` | 1 |
| [16b](16b.md) | Internal Ops and Fleet | `/ops` | 0→2 |
| [17](17.md) | About | `/about` | 0 |
| [18](18.md) | Contact Support | `/support` | 0 |
| [19](19.md) | FAQs | `/faqs` | 0 |
| [20](20.md) | Terms | `/terms` | 0 |
| [21](21.md) | Privacy | `/privacy` | 0 |
| [22](22.md) | Meter Linking | `/meters/link` | 2 |
| [22b](22b.md) | Verification Report | `/verification-reports/[token]` | 1 |
| [23](23.md) | Utility Dashboard | `/dashboard/utility` | 3 |
| [23b](23b.md) | Utility Control Consent | `/settings/utility-control` | 3 |
| [24](24.md) | Multi-Property | `/dashboard/properties` | 4 |
| [25](25.md) | White Label Console | `/admin/organizations/[id]` | 4 |
| [25b](25b.md) | Linked Smart Devices | `/settings/smart-devices` | 2 |
| [26](26.md) | Water Gas Vending | `/utilities` | 5 |
| [A1](A1.md) | Usage History | `/history` | 1 |
| [A2](A2.md) | Billing Payments | `/billing` | 1 |
| [A3](A3.md) | Control Schedules Budgets | `/control` | 1 |
| [A4](A4.md) | Alerts | `/alerts` | 1 |
| [A5](A5.md) | Community | `/community` | 1 |
| [A6](A6.md) | Building Setup and Rooms | `/dashboard/landlord/buildings/[id]/rooms` | 0→1 |
| [A7](A7.md) | Meeting Mode | `/disputes/[id]/meeting` | 1 |
| [A8](A8.md) | Recharge Return | `/payments/return` | 1 |
| [A9](A9.md) | Account Recovery | `/account/recovery` | 0 |
| [B1](B1.md) | Device Detail and Diagnostics | `/devices/[id]` | 1 (B8 utility view3) |
| [B2](B2.md) | Command Activity | `/devices/[id]/commands` | 1 (B8 utility view3) |
| [B3](B3.md) | Orders and Install Booking | `/orders` | 1 (B8 utility view3) |
| [B4](B4.md) | Subscription and Plan Management | `/settings/subscription` | 1 (B8 utility view3) |
| [B5](B5.md) | Support Case Detail | `/support/tickets/[id]` | 1 (B8 utility view3) |
| [B6](B6.md) | Connection Help | `/connection-help` | 1 (B8 utility view3) |
| [B7](B7.md) | Bank Transfer and Payment Instructions | `/payments/transfer/[quote_id]` | 1 (B8 utility view3) |
| [B8](B8.md) | Outage Incident Detail | `/ops/incidents/[id]` | 1 (B8 utility view3) |
