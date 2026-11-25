# SmartClamp — focused pitch screenshots

Seven selected captures of the actual website, populated using isolated database/Auth services, signed simulated readings and local payment-provider fixtures. The QA banner remains visible. These images show software prototype behavior, not live deployed hardware or real merchant acceptance. Captures are from the existing verified gallery; they are not new renders from 25 November.

[Open the focused visual gallery](gallery.html) · [Download all seven screenshots](smartclamp-pitch-screenshots.zip)

## 01. Home energy monitoring

[Open screenshot](../screenshots/homeowner-overview.jpg)

Current power, supply present, device connectivity, electricity credit and usage chart. Readings are signed simulated QA telemetry.

## 02. Consumption history

[Open screenshot](../screenshots/homeowner-history.jpg)

Recorded usage over time. This is whole-device consumption, not appliance identification.

## 03. Landlord building overview

[Open screenshot](../screenshots/landlord-overview.jpg)

Actual building records and navigation into rooms. This does not demonstrate a multi-room energy comparison.

## 04. Room and SmartClamp linking

[Open screenshot](../screenshots/landlord-rooms.jpg)

A linked resident and room device. The capture contains one populated room; a multi-room monitoring/distribution screen is not implemented.

## 05. Shared-housing resident wallet

[Open screenshot](../screenshots/resident-wallet.jpg)

A resident's own room wallet and central-meter payment destination. This is not a landlord transfer of units between residents.

## 06. Electricity recharge quote

[Open screenshot](../screenshots/homeowner-wallet-quote.jpg)

An actual API quote with destination, amount and itemized fees, using a local provider fixture; no real money is charged.

## 07. Power-control request

[Open screenshot](../screenshots/homeowner-control.jpg)

The implemented control request and phone-confirmation form. No physical relay switching is demonstrated.

## Requested capabilities that these screenshots cannot prove

| Requested demonstration | Actual boundary |
|---|---|
| Current monitoring and electricity present | Shown in the overview, using simulated signed input. |
| Electricity absent / outage | The software has supply-state handling, but this selection does not contain an outage-state capture. Do not rename the present-state image as an outage demonstration. |
| Appliance using the most electricity | No implemented appliance-disaggregation screen/data pipeline was found. The current clamp view shows aggregate consumption. Appliance estimates would need explicit labels, or measured appliance sensors and a real integration. |
| Landlord monitoring multiple rooms | Building/room linking exists; the current capture shows one room. The side-by-side multi-room energy dashboard still needs implementation/population. |
| Load a shared meter and distribute units | Individual room purchases against the configured central meter are implemented. The intended optional extension is allocation of a newly funded joint tenant purchase, not landlord control of tenants’ existing credit. Production joint allocation remains unimplemented; the separate `/demo` now illustrates it. |
| Remote power control | Request/confirmation UI exists; physical switching and feedback require qualified connected hardware. |

## Investor access and SQL

An interactive demo can use a separate database/Auth project, seeded demonstration accounts and a device simulator. Its controls should change only simulated device state, its payment path should use a sandbox, and its banner should identify demo data. This does not require modifying the production database or weakening authentication.

Applying the production SQL creates schema; it does not supply hardware readings, provider credentials, working production hardware adapters or unfinished features. A real deployment also needs the API and worker, Auth settings, keys and accepted provider/hardware connections. No production SQL or publication was performed for this pitch pack. A publicly accessible interactive investor demo has not been deployed by this pack.
