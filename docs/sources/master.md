# Source transcription — reference, not execution instructions

Table of Contents

SmartClamp — Master PRD & Ecosystem Specification (Fully Reconciled)
This single document merges and supersedes the prior “SmartClamp: Unified Ecosystem Specification” and “SmartClamp PRD” documents. Every decision made in the working design chat is authoritative wherever it conflicts with the prior documents. Nothing from either prior document has been dropped — content that still holds is carried forward; content that was superseded is explicitly marked as such, with the reasoning, so no one mistakes a correction for an oversight.

00. How To Read This Document
Organized by topic first (architecture, hardware, software, security), then by build phase (Phase 0–5), then by go-to-market and business detail — this way the technical spine and the product/business spine both live in one place instead of two documents that can drift out of sync.
CORE INSIGHT: SmartClamp’s real opportunity isn’t selling a clamp. It’s becoming the trust layer between anyone who pays for electricity and anyone who bills them for it — verifiable, self-service, and functional with or without a meter, with or without NEPA’s cooperation.

01. The Problem
Nigerian electricity billing runs on trust nobody’s earned. In shared housing, a fan and a fridge pay the same split bill. In single homes with no meter, there’s no way to know if NEPA’s number reflects reality at all. Landlords chase rent-adjacent electricity disputes instead of running their buildings. Tenants get disconnected with no warning and no evidence to push back with. Theft goes undetected because nothing cross-checks anything else.
The common thread: nobody has a verifiable record of what actually happened on the wire. SmartClamp is that record — with control layered on top wherever the hardware allows it.
The core technical principle behind the entire system: read current before it enters a property, at a point that cannot be bypassed, and cross-check every reading against the level one step up. No single reading is ever trusted in isolation.

02. What SmartClamp Is
What it is NOT
A smart-meter replacement. A landlord billing tool that takes a cut. A product that requires NEPA’s cooperation to work. Several unrelated products bolted together.
What it IS
One device family (Transformer, Pole, House, Building Hub — Part 03) and one software platform, deployed in whichever configuration a building or home needs — always cross-checking its own data against something one level up, so nobody has to take anyone’s word for it.
The promise
If electricity passes through a wire you care about, you’ll know exactly how much, when, and whether anyone tampered with it — and wherever a relay is fitted, you control it yourself.
End goal
The verification and control layer every Nigerian building runs on, whether or not it ever touches our own hardware.

02.5 Concepts Explained From Scratch (Read This Once Before Anything Else)
This section assumes no electronics or software background. Every term below is used repeatedly in the rest of this document — understanding it here means never needing to stop and ask “wait, how does this actually work?” later.
Current Transformer (CT): a donut-shaped clamp that measures how much electric current is flowing through a wire without ever cutting or touching the wire itself. It works like a stethoscope for electricity — you clip it around the outside of the wire, and it senses the current from the magnetic field the wire naturally produces. This is why installation doesn’t require an electrician to cut power or rewire anything — the clamp just closes around the existing wire.
Voltage sensor (ZMPT101B): a small module that measures voltage — how “strong” the electrical push is — separately from current. Multiplying voltage × current gives real power (Watts), and accumulating power over time gives energy (kWh, what you’re actually billed for).
Microcontroller (ESP32): the small computer chip inside every device. It reads what the CT and voltage sensor are sensing, does the math, decides what to do (log it, send it, cut power), and talks to whatever network the device has.
GSM: the same cellular network technology a regular phone SIM card uses. A device with a GSM module can send data over the mobile network, the same way a phone can, without needing anyone’s home Wi-Fi.
ESP-NOW: a way for two of these chips to talk directly to each other over short distances (up to roughly 100–200 meters) without needing a Wi-Fi router or the internet — like a walkie-talkie between two devices. It’s built into the same chip already being used, so it costs nothing extra to use.
RS485: a simple, reliable wired method (a pair of physical wires, not radio) for devices to send data to each other over longer distances than a cable like USB could manage, immune to the kind of interference that would block a radio signal through a metal roof.
Relay / Latching Relay: an electrically-controlled switch — instead of a person flipping it by hand, the microcontroller tells it to switch on or off. A latching relay is a specific type that, once switched to a position, stays there using zero ongoing power — it only needs a brief pulse of power to change position, not continuous power to hold it. This matters because these devices have no battery.
Supercapacitor: a small component that stores a tiny amount of electrical energy — not nearly enough to run a device for any real length of time (unlike a battery), but enough to bridge a few seconds during a power cut, just long enough to record the exact moment power was lost.
Bypass (the core problem this whole product exists to solve): illegally tapping into a wire before it reaches an official meter, or interfering with the meter itself, so that the electricity used is never counted or billed. It’s effectively wire-tapping for electricity theft.
TOTP (Time-based One-Time Password): the same technology behind banking apps and authenticator apps — a code that automatically changes every 30 seconds or so, generated from a secret shared between two systems. In this document, it’s used invisibly between the company’s server and a device, so that even if someone tried to fake a command to a device, they couldn’t produce a valid code without that shared secret.
DLMS/COSEM: an international technical standard that most modern smart electricity meters use to communicate their data. Think of it as a common “language” meters speak, so a reader device (like the one this platform could add) knows how to ask a meter “what’s your current reading?” and understand the answer, regardless of which company manufactured that meter.
Wallet: not a physical thing — it’s the running balance of prepaid electricity units a specific device or room has, stored in the software, that goes up when someone pays and down as electricity is used.
Tamper-evident / hash-chained: a way of storing records so that each new entry mathematically “locks in” everything that came before it. If anyone tried to secretly go back and alter an old reading, the chain would visibly break — making the whole log resistant to retroactive tampering, the same principle used in systems built for permanent, trustworthy record-keeping.

03. Hardware & Device Architecture (Fully Reconciled)
03.1 Why the Original Hardware Model Needed Revision
The original hardware spec assumed every device — regardless of location — connects via plain Wi-Fi straight to the cloud, with no distinction between a Gateway and a non-Gateway device, and no cellular layer at all. In practice, Pole-mounted devices are frequently too far from any home Wi-Fi network to rely on it, and GSM (cellular) hardware is too expensive to put on every single device. The reconciled architecture below solves this with a one-GSM-per-pole-structure and one-GSM-per-shared-housing-building model, using a free, already-built-in radio feature (ESP-NOW) for short local hops instead of paying for connectivity on every unit.
The original spec also used a Master + Sub two-device model for Single Home Pro (a device with a relay, plus a second read-only device on a branch wire, purely to cross-check the Master). This has been superseded: since Single Home Pro’s only remaining job is whole-house on/off (per-appliance control was ruled out on cost grounds — Section 03.6), and the Pole Device already independently measures that exact same current from outside the house, a second in-house device would be measuring something that, absent an actual bypass event, cannot legitimately differ from what the Pole already reports. Adding a relay directly onto the customer’s own Pole Device achieves the same control outcome with one device instead of two, one enclosure instead of two, and one install visit instead of two.
03.2 Final Device Line-Up
Device
Role
Where
Required For
Transformer Monitor
Supply-side reference — logs when/whether power is available at the source
On the transformer
Community-level, shared across every quadrant once Phase 3/NEPA engagement begins
Pole Gateway
Anti-bypass measurement + the single GSM uplink for its pole structure
Customer pole (one per pole)
Every pole structure has exactly one
Pole Device (other)
Anti-bypass measurement for one specific house, no GSM of its own
Customer pole (up to ~4 more per structure)
The remaining houses sharing that pole
House (Full)
Per-room measurement + relay control
Inside a shared-housing room
Mandatory — the Pole can only see a building’s total, never one room’s share
Building Hub
Pure data-collection and GSM uplink point for a shared-housing building
Utility closet/central point in the building
One per shared-housing building
IR-Reader (new — Section 06.1a)
Read-only optical-port reader for a customer’s existing third-party smart meter
Puck-style unit physically aligned to the meter’s own optical port
Any Free/paid customer who wants live balance/usage data from a smart meter they already own, without a formal DisCo partnership
Single-Home Pro control: no separate device. Whichever Pole Device already serves that specific house (Gateway or non-Gateway) has an optional magnetic latching relay added to it (Section 03.6), giving whole-house remote on/off, scheduling, and budget-based auto-cut without any device installed inside the home.
03.3 Core Equipment (Constant Across Every Device)
Component
Function
ESP32 (replaces the originally specified ESP8266)
Brain, built-in Wi-Fi + Bluetooth radio, multiple analog inputs
HLK-PM01 Power Module
Steps mains AC down to regulated low-voltage DC — self-powered from the wire, no batteries
Small supercapacitor (new — not in the original spec)
Bridges the split-second when mains power is disappearing, so the device can log the exact outage timestamp before it loses power entirely (Section 03.7). Not a battery — no maintenance, effectively unlimited charge cycles, ~$1
EEPROM/flash storage
Stores usage data locally, continuously, even with no connectivity for extended periods
Plastic/weatherproof enclosure
IP65-rated outdoors (Transformer, Pole), standard indoor enclosure (House, Building Hub)
Why ESP32, specifically, not just “a newer chip”
The original ESP8266 has only one analog input pin. Pole devices need three simultaneous analog readings (two current sensors + one voltage sensor); even the House (Full) device needs two. ESP8266 cannot do this without bolting on an external ADC expansion chip — an extra part and cost that ESP32 avoids entirely, since it has multiple built-in ADC channels. This is a same-cost-class swap, not a spec upgrade for its own sake, and it doesn’t change any feature logic — only the chip’s physical ability to read the sensors the design already requires.
Additional built-in ESP32 capabilities now put to use, at zero extra hardware cost
Capability
Use
Hardware AES/SHA acceleration
Runs the TOTP/HMAC command-authentication scheme (Section 05.4) efficiently, no separate crypto chip needed
Secure Boot + Flash Encryption
Prevents extraction of stored secret keys even with physical access to a stolen/opened device — required given devices sit on public poles and in tenant rooms outside company control
Bluetooth/BLE
Installer provisioning: a phone app connects over BLE (no Wi-Fi/GSM/internet needed) to configure a brand-new device — assign Device ID, set network credentials, run signal diagnostics — before it’s ever connected to the cloud
Capacitive touch pins
Allows a local “acknowledge/test” button on a sealed IP65 enclosure without a physical hole/gasket weak point
ESP-NOW (built into the Wi-Fi radio)
Replaces the need for a separate long-range radio for same-pole device communication (Section 04.2) — zero additional hardware
Built-in PWM controller (LEDC) driving a single status LED
A cheap, physical health indicator an installer or user can read at a glance without opening the app — solid (all good), blinking red (tamper detected), slow blink (no connectivity). Settled addition, negligible cost
Dual-core architecture
ESP32 has two CPU cores. Firmware should deliberately dedicate one core to sensor-reading and safety-critical relay decisions, and the other to networking/GSM/ESP-NOW traffic — so a networking hiccup can never delay a safety cutoff. Settled as a firmware architecture requirement, not just an available option
Dedicated external Hall-effect IC (e.g. TI DRV5033-class, ~$0.50/unit) mounted near the CT
Specified, pending bench test — replaces reliance on the ESP32’s built-in Hall sensor, which is too low-resolution for this specific job. Detects a documented, real meter-tampering technique — holding a strong magnet near a CT clamp to suppress its reading — feeding the same alert pipeline as Layer 1 tamper detection (Section 08.1). Small, cheap, dedicated component beats a repurposed low-resolution built-in sensor here
03.4 Component-Specific Hardware, by Device
Transformer Monitor
CT sized for transformer output · ZMPT101B voltage sensor · GSM optional, deployment-dependent · weatherproof enclosure. No relay.
Pole Gateway
2×SCT-013 (100A range — corrected from an earlier undersized 5A-range part; confirmed with ~40% headroom — NEMSA-approved single-phase meters in Nigeria are standardized at a 60A maximum, so this was never actually an open sizing question, just previously undocumented as checked) · ZMPT101B · GSM module (SIM800/SIM7000) with external antenna, the pole structure’s single uplink · weatherproof enclosure · optional magnetic latching relay (Single-Home Pro tier only, Section 03.6). Uses ESP-NOW (Section 04.2) to collect data from other Pole Devices on the same structure. Can send SMS as a fallback alert channel using the GSM module’s existing SMS capability, for critical events (tamper, disconnect) when the data link fails.
Pole Device (Other)
Same sensors as the Gateway, no GSM — communicates via ESP-NOW to the Gateway on the same pole. Same optional latching relay for Single-Home Pro tier if this is the device serving that house.
House (Full) — Shared Housing Room
1×SCT-013 (sized to room/circuit load, not the pole’s 100A range) · ZMPT101B · mandatory magnetic latching relay · wired RS485 connection to the building’s Hub (chosen over any radio option — Nigerian roofing is frequently metal, which heavily attenuates radio signal; wired RS485 run alongside the electrical branch wiring already being installed avoids this entirely) · indoor enclosure.
Building Hub
GSM module + antenna (the building’s single uplink) · RS485 transceiver collecting data from every Room Device on the building’s bus · EEPROM buffering if the GSM link is temporarily down. No CT, no voltage sensor, no relay — pure collection and uplink point.
03.5 Voltage Protection (Available Wherever the ZMPT101B Is Fitted)
ZMPT101B reads voltage continuously.
If voltage < 180V (brownout) or > 250V (surge) → trigger protection logic.
On a relay-equipped device (Pro-tier Pole, or shared-housing House): relay cuts power; alert sent (“⚠️ Voltage too low (165V). Power cut.”). On a relay-less device (Basic/Basic Pro): alert only, no action.
Voltage returns to normal.
User taps [RESTORE POWER] (or auto-restores after 5 minutes stable, if enabled) → relay restores.
03.6 The Relay: Magnetic Latching Relay (Corrected Recommendation)
The original spec called for a generic “30A Relay.” This is corrected to a magnetic latching relay, in the component class already proven inside prepaid electricity meters for exactly this application — certified to IEC 62055-31 (UC3), the international standard for remote-disconnect meter relays (e.g., the JS201-series and similar 100A-class latching relays explicitly sold for “electricity meter” use). Get direct quotes on specific part numbers/pricing before finalizing a BOM.
Why latching, specifically, and not a standard contactor: a latching relay needs only a brief pulse (~50–100ms) to switch state, then holds that position with zero continuous power draw — including through a full outage. A standard (non-latching) relay or contactor needs continuous power just to stay closed, and drops open the instant power is lost. Given the device has no battery (Section 03.1’s core equipment), a latching relay means: if power is lost while the relay is ON, it stays ON through the outage and is still ON the instant power returns — no ambiguous default state, no re-triggering logic needed on restart.
Where the switching pulse itself comes from, precisely (so nothing is left to imagination): under normal operation (any scheduled command, budget cutoff, or manual toggle, at any time mains power is present), the pulse is drawn from the device’s own regulated power rail — the same supply already powering the ESP32 — through a small transistor/MOSFET driver stage triggered briefly by a GPIO pin. The supercapacitor (Section 03.7) is not involved in this normal case; there’s full line power available. The supercapacitor’s only role is the narrow window where mains power is disappearing at that exact instant (an actual outage event), giving the device just enough borrowed energy to log the precise timestamp of the loss — and, if a protective auto-cut happened to be firing at that same moment, to complete that pulse before power is fully gone.
03.7 Power & Outage Timekeeping
No battery anywhere in the system — every device is powered directly from the line it monitors, with zero maintenance/replacement cycle. During a full outage, a device has no power and cannot log anything at that exact instant, except for the brief window the supercapacitor provides (Section 03.6).
Clock resync: a device’s internal clock can drift during a long outage. GSM-equipped devices (Pole Gateway, Building Hub) resync immediately on power restoration using the cellular network’s own broadcast time (NITZ). Non-GSM devices receive the corrected time relayed from their Gateway/Hub via ESP-NOW or RS485 once reconnected.
03.7.1 The Small Components Nobody Had Priced Yet — Burden Resistors, Filtering Capacitors, Diodes
Every BOM discussion so far focused on the big-ticket items (the chip, the CT, the relay). A CT and a voltage sensor cannot actually connect to the ESP32’s analog input pins on their own — each needs a handful of small, cheap supporting components to convert their raw signal into something the chip can read cleanly. These are typically a few cents to a few tens of cents each, but skipping them means the sensors don’t work at all, so they belong in the BOM explicitly:
Component
Why It’s Needed
Typical Role
Burden resistor (one per SCT-013 CT)
A CT clamp outputs a small current signal proportional to what it’s measuring — but the ESP32’s ADC pins read voltage, not current. The burden resistor converts the CT’s current output into a voltage the ADC can read, by the basic relationship Voltage = Current × Resistance
Sized so the CT’s maximum expected output current, multiplied by this resistor’s value, produces a voltage safely within the ADC’s 0–3.3V input range — never exceeding it
Bias/offset resistors (a pair)
The CT’s output naturally swings both positive and negative (AC current), but the ESP32’s ADC can only read positive voltages (0 to 3.3V). This resistor pair shifts (“biases”) the signal upward so the whole waveform sits within the ADC’s readable range instead of being clipped in half
Centers the AC waveform at roughly 1.65V (half of 3.3V), so it swings symmetrically within range
Smoothing/filtering capacitor (small, e.g. ceramic)
Removes high-frequency electrical noise from the sensor signal before the ADC reads it, preventing jittery, inaccurate readings
Placed directly across the ADC input, working alongside the bias resistors
Decoupling capacitors (one per power pin on the ESP32 and each sensor module)
Every chip needs a small reservoir of stable power right next to it — without this, voltage dips caused by the relay switching or the GSM module transmitting can cause the ESP32 to glitch or reset
Standard practice on every microcontroller board — typically a small ceramic capacitor plus a larger bulk capacitor per power rail
Flyback diode (across the relay coil, if not already built into the relay module)
When a relay coil is switched off, it briefly generates a voltage spike backward into the circuit that can damage the driver transistor. This diode safely absorbs that spike
Required any time a coil (relay, motor, etc.) is driven directly by a transistor
Worked example, showing the calculation approach (illustrative, not a final spec): a common SCT-013 variant is rated to output 50mA of current when it senses 100A flowing through the clamped wire (a 2000:1 ratio). To turn that 50mA into a safe, centered voltage swing for a 3.3V ADC, a burden resistor around 62–100Ω is a typical starting point in reference designs for this exact sensor — this produces a voltage swing comfortably within the ADC’s range at full-scale current. This number is a reasonable starting point based on common reference designs for this sensor, not a confirmed final value — the exact resistor should be calculated against the specific SCT-013 variant’s datasheet (some Nigerian suppliers sell slightly different output ratings under the same name) and verified on a physical prototype before it goes into a production BOM. This is the kind of calculation a hardware/electronics engineer should sign off on with a multimeter in hand, not something to manufacture from a document alone.
03.8 What the Hardware Does On Its Own (No App Needed)
Function
How It Works
Measures current
SCT-013 reads current in real time (range per device, Section 03.4)
Calculates power
ESP32 calculates Watts (W = V × A) and kWh
Stores data locally
Flash/EEPROM saves usage data continuously, even with no connectivity for months
Controls power
Latching relay cuts or restores power on command (relay-equipped devices only)
Self-powered
HLK-PM01 powers from the same wire — no batteries
Connectivity
ESP-NOW (same-pole), RS485 (shared-housing room→hub), GSM (Pole Gateway and Building Hub uplinks)
Unique ID
MAC address / Device ID for individual addressing
Tamper detection
Detects clamp removal, relay bypass, physical interference
Overload protection
Detects a load over 2000W, alerts (and cuts, on relay-equipped devices)
Voltage protection
Cuts power during brownout (<180V) or surge (>250V), where relay-equipped
OTA updates
Firmware updates over whichever connectivity path the device has (Section 04.4 covers the ESP-NOW chunking consideration)

04. Connectivity Architecture
04.1 The Problem With the Original Assumption
Pole-mounted devices are frequently too far from any home Wi-Fi to rely on it, and putting GSM hardware on every single device is prohibitively expensive. The reconciled model below uses one GSM per pole structure and one GSM per shared-housing building, with free built-in radio features covering the short local hops.
04.2 Same-Pole Devices — ESP-NOW
Devices mounted on the same physical pole (Gateway + up to ~4 other Pole Devices) communicate via ESP-NOW, built into the ESP32’s existing Wi-Fi radio at zero extra hardware cost — no separate radio module needed. Distance between same-pole devices is trivial (centimeters to a few meters), well within ESP-NOW’s realistic range (~100–200m), so this is a low-risk link.
Supporting context on single-home positioning: single-home meters/service points in Nigeria are typically mounted outdoors on an exterior wall, with a direct, unobstructed line-of-sight back to the serving pole — unlike shared-housing room devices, which sit indoors inside a building. This favorable positioning is part of why the single-home Pole Device (with its optional relay, Section 03.6) carries lower connectivity risk than the indoor shared-housing case, which is why Building Hub’s wired RS485 approach (Section 04.3) was chosen specifically for that harder scenario rather than applied everywhere.
04.3 Shared-Housing Building Connectivity — Building Hub Model
One Hub device per building carries the building’s only GSM module. Room devices connect via wired RS485, run alongside the branch wiring electricians are already installing — this avoids relying on radio penetration through metal roofing entirely, which is common in Nigerian construction.
SHARED HOUSING BUILDING    Room 1 Device (Full) ──┐    Room 2 Device (Full) ──┼── Wired RS485 ──→ BUILDING HUB (1 GSM) ──→ CLOUD    Room N Device (Full) ──┘
04.4 Firmware Updates Over ESP-NOW — Specified (Standard OTA Pattern)
Ordinary telemetry (small sensor readings) travels over ESP-NOW with no meaningful delay. Firmware update files are much larger (hundreds of KB) and exceed ESP-NOW’s small per-packet size (~250 bytes). Specified approach: sequence-numbered chunks, CRC-checked on reassembly, with resume-on-failure so a dropped connection partway through doesn’t restart the whole update — a standard, well-understood OTA pattern, not an open design question. This is bounded engineering work to implement, not a design risk, and only applies to non-GSM Pole Devices; anything with GSM or direct Wi-Fi updates normally.
04.5 Pole/House and Building Hub Never Communicate Locally
Each uploads independently to the cloud. Bypass detection (Pole’s total reading vs. sum of all rooms) happens as a cloud-side comparison of two independent data streams, not a local wire or radio link between the Pole and the Building Hub.
04.6 Rejected Approach: LoRa Chain to a Single Transformer-Level GSM
Considered and explicitly rejected: chaining every pole in a feeder line via LoRa back to one GSM radio at the transformer, to save on SIM costs. Rejected due to cascading failure risk (one dead hop cuts off everything behind it in the chain) and compounding unreliability (even a strong 98%-per-hop success rate drops to roughly 82% success over a 10-hop chain), versus the current model’s fully independent per-pole/per-building reliability. Filed as a possible Phase 4/5 exploration only after the simpler model is field-proven — not part of the current architecture.
04.7 Backup Mechanisms
Scenario
Backup
GSM fails
Data stored locally, retried later; critical alerts fall back to SMS
Local network (ESP-NOW/RS485) fails
Each device stores data independently
No connectivity at all
Decided: monthly handheld collection via installer/agent visits, by default — a vehicle or drone-based collection method is a later upgrade only if real field data shows it’s actually needed, not a Phase 1 decision to make speculatively now

05. Software — One Feature Model, Not Separate Apps
The landlord/homeowner and the tenant/room-owner are not two kinds of user with disjoint feature sets. The app is one codebase; features unlock along two independent axes:
Hardware axis (physics — no subscription can unlock this): only what requires a physical relay to act is hardware-gated. A device with no relay genuinely cannot turn power off, no matter what tier the account is on.
Subscription axis (a business decision, independent of hardware): everything else — measuring, tracking, disputing, paying, viewing — works the same regardless of hardware tier. Whether any of it is free or paid is a pricing choice, not a hardware limitation.
05.1 Subscription Tiers (Reconciled — Three Tiers, Decoupled From Hardware)
The original spec used two tiers (Basic/Pro) mapped directly to hardware (no-relay/has-relay), with an early “Mid-tier (Plus)” concept floated as “Basic + Master+Sub correlation, no relay.” That Plus tier is the direct ancestor of what this document calls Basic Pro — same intent (deeper verification/features without a relay) — reconciled and renamed since its original specific mechanism (Master+Sub correlation) no longer exists (Section 03.1). Nothing about that early decision was dropped; it’s carried forward under its current name with an updated mechanism.
This is refined into four tiers — a new Free tier added below Basic — with Basic and Basic Pro sharing identical hardware, a pure software-depth split:
Tier
Hardware
Unlocks
Free (new, corrected below)
None for the instant lookup; an IR-Reader (Section 06.1a) for live balance
Instant meter validation (confirms it’s a real, active meter; shows the name/address on file) — no signup, no hardware. Live balance, usage history, and bill payment require either an IR-Reader install or a future DisCo partnership (Section 06.4) — not available from the homepage lookup alone
Basic
Pole only (no relay)
Everything in Section 05.2 (Open Features)
Basic Pro
Pole only — same hardware as Basic
Everything in Basic + deeper analytics (Section 05.2.1)
Pro
Pole + optional latching relay (single-home) / mandatory House (Full) with relay (shared housing)
Everything in Basic Pro + every Hardware-Gated feature (Section 05.3)
Why Free exists, and why it matters more than its lack of revenue suggests — corrected to two honest tiers, not one implied capability: the original framing of Free implied a full balance/history lookup from just a meter number, matching what a customer might experience on a competitor’s site. Checking this against what Nigerian bill-payment aggregator APIs actually expose, that’s not accurate — those APIs can confirm a meter is real and active (and return the name/address on file), but they don’t expose live balance or usage history; a utility’s own metering backend holds that, not a payment aggregator. So Free is split honestly:
Instant, zero-hardware, zero-signup validation — a genuine trust hook, right on the homepage: type a meter number, see it’s real. This alone is still a meaningful acquisition tool, since it’s an immediate, tangible interaction before any signup.
Live balance, usage history, and bill payment — requires either the IR-Reader (Section 06.1a, a small physical add-on that actually reads the meter’s own optical port) or a future formal DisCo data-sharing partnership. Neither is “free software magic” — one is real (if minimal) hardware, the other is external and not guaranteed.
The strategic logic behind the funnel still holds even with this correction: people don’t want to juggle multiple apps for one thing, so becoming their one utility app — even starting from validation alone — means that when they eventually want live data or need a clamp, SmartClamp is already the app they have installed and trust, not a cold-start decision. See Section 10.0 for how this reshapes the build sequence, and Section 06.1a for the IR-Reader that makes the live-data promise actually true.
The rule for the paid tiers: a customer who owns relay-equipped hardware can still subscribe at Basic or Basic Pro — the relay simply sits dormant until they upgrade. A customer without relay hardware can never access Pro features, regardless of what they’re willing to pay, because the physical relay doesn’t exist on their premises. This decouples the hardware sale from the software subscription and creates a clean upsell path without a truck roll.
05.2 Open Features — Any Account, Any Hardware
Usage & Monitoring
Live Usage View (real-time Watts) · Usage History (daily/weekly/monthly) · Remaining Balance · Voltage Status (where the sensor is fitted) · Pattern Study (peak times, habits, savings suggestions) · Compare Usage (benchmark vs. similar households) · Hours of Light Used · Data Accuracy % (vs. upstream source) · Verification Report (formal, dispute-ready, and published as a signed, timestamped public microsite URL per device — anyone holding the link, e.g. a new tenant, a bank, or NEPA, can view a read-only version with no login required, restoring an agreed feature from the original architecture that had dropped out of later drafts) · Tamper Log (full history, not just live alerts) · Device Status (online/offline).
Billing & Payments
Recharge (bank transfer, card, Paystack, OPay, USSD) · Monthly Bill + Breakdown · Payment History · Payment Reminders · Auto-Recharge · Generator Cost Share · Export Data (PDF/Excel).
Alerts & Notifications
Low balance (<10%) · Disconnection notice (balance = 0) · Voltage alert/restore · Power restored · Overload detected/cleared (>2000W) · Payment confirmation · Tamper alert (own device) · Inactivity nudge (no login 1 month) · Device offline (no heartbeat 24hrs). Delivered via SMS and in-app push by default; email is an additional per-user preference.
Terminology note (corrected): on tiers without a relay, refer to these internally as “monitoring alerts,” never “protection” — the device can notify but cannot act on what it detects. See Section 05.3.1 for the tier-by-tier breakdown of which events can also trigger an auto-cut.
Community & Accountability
Public Dashboard · Public Tamper Alerts · Report Suspicious Activity · full transparency (everyone sees the same data).
Dispute Resolution
Usage Log (visual timeline) · Dispute Form · Evidence Access (download logs as evidence) · “Meeting Mode” — a stripped-down, in-person settlement view showing only the specific data relevant to one dispute (the disputed period’s usage graph and the bill breakdown), deliberately excluding everything else, so a landlord and tenant sitting down together see one shared, undistracted set of facts rather than a full dashboard neither party fully controls (restored from the original architecture’s agreed items).
Account & Access
Multi-User Access · Guest Access (temporary, no full login) · Offline Mode (shows the last known state with a clear “last synced: [time]” timestamp banner whenever connectivity is down, rather than a blank or frozen screen — replaces “Dark Mode” as the original architecture’s stated priority; Dark Mode remains a standard cosmetic preference alongside it, not instead of it) · Language · Energy Saving Tips.
05.2.1 Basic Pro Adds (Same Hardware as Basic — Pure Software Depth), Mapped to Their Screen
Feature
What It Does
Lives On
Appliance load-signature detection
Identifies the likely running appliance (fridge, AC, kettle) from its current draw signature — no per-appliance sensor needed
Usage History screen — a breakdown widget beneath the main graph
Power factor reporting
Flags inefficient appliances or poor wiring using existing voltage + current data
Usage History screen — a secondary gauge/metric alongside the usage graph
Automatic under-supply credit calculator
Auto-generates a ready-to-submit “NEPA owes you credit for X outage hours” statement
Billing & Payments screen, and attached as a line item to the Dispute Center’s evidence download
Bill forecasting
Projects month-end usage/cost from current pace
Billing & Payments screen — a projected-total callout above the current bill
Same-pole peer benchmarking
Anonymized comparison against other houses on the same pole — richer than a generic “similar households” average
Usage History screen — replaces/extends the generic Compare Usage card
Tamper-evident hash-chained audit trail
Cryptographically strengthens the Verification Report into legal-grade evidence — each logged reading is chained to the previous one so any retroactive alteration is detectable
Powers the Verification Report public microsite (above) and the Dispute Center’s evidence download — not a separate screen, a strengthening of two existing ones
Scheduled auto-delivery of reports
Monthly Verification Reports auto-sent to the user (and landlord/NEPA in later phases) without being requested
Settings screen — a toggle + frequency selector
SMS/USSD usage query
Feature-phone users can text a shortcode for current usage/balance, not just make payments this way
A new USSD menu branch alongside the existing payment flow (Section 05.7) — “Check Balance” as a sibling option to “Buy Units”
Read-only multi-viewer access
Family or a landlord can view live data without full account access
Settings screen — a “Manage Viewers” section, add/remove by phone number or email
05.3 Hardware-Gated Features — Require a Relay (Pro Tier Only)
Feature
What It Does
Remote ON/OFF
Turn power on or off from anywhere
Schedule ON/OFF
Time-based rules, different per day if needed; syncs to the device, which executes on its own, online or offline, with a confirmation on each trigger
Self-Set Budget
Set a monthly spending limit; system calculates a daily unit limit, cuts power once that day’s limit is hit, restores automatically at midnight, user can override by adding units on the spot
Restore Power
After a voltage-protection, budget, or schedule cut
Hours of Light Saved
Requires an actual OFF action to mean anything
Master + Sub Correlation
Superseded — this feature existed only under the retired two-device single-home Pro model (Section 03.1) and no longer applies; single-home Pro’s verification instead relies on the Pole’s own upstream comparison, unchanged from Basic
Medical/critical-load exemption — decided: keep it simple. No dedicated “critical load” flag or physical buzzer is built. The safeguard for anyone relying on power-dependent medical equipment is warning lead-time, not preventing the cut — the existing 10%-remaining low-balance alert (Section 05.2) already gives advance notice before any automatic cutoff. A local audible buzzer is noted as a possible future option, explicitly non-essential and not part of the current build.
05.3.1 Predictive Safety, Corrected by Tier
Event
Basic / Basic Pro (no relay)
Pro (has relay)
Abnormal current spike
Alert only
Alert; optional auto-cut
Sustained overload (>2000W)
Alert only
Alert; optional auto-cut
Voltage brownout (<180V)
Alert only
Alert; optional auto-cut
Voltage surge (>250V)
Alert only
Alert; optional auto-cut
Loose connection indicator
Alert only
Alert only
Potential shock/fire pattern
Alert only
Alert; optional auto-cut (predictive, not certified)
Position, unchanged from the original spec: no claim of certified shock protection or certified fire detection anywhere in the system. This is predictive monitoring only, using existing hardware. Safety-critical protection (RCD, overcurrent, earthing) remains hardware-based, independent of the ESP32 or any cloud/Wi-Fi dependency.
05.4 Command Security (New Section — Not in the Original Spec)
The original spec’s device-identity security (per-device signing, Section 11.1’s Tech Stack) protects against a forged command being sent directly to hardware. It does not protect against a second, distinct threat: someone gaining access to a legitimate account/session, from which any command looks fully authorized to the backend. Two separate protections are needed:
Device-level threat (forged command bypassing the backend): solved by TOTP/HMAC-style rotating token authentication — a shared secret between backend and device produces a time-based code that must accompany any valid relay command. This runs entirely behind the scenes; nobody sees or types anything extra, they just tap a button as normal. This still applies to every remaining relay command — an account holder’s own schedule and self-set budget actions, and a landlord’s Bulk Control — but not to any third-party punitive cutoff, since that capability (the original Rent/Dues Override) has been removed entirely as illegal self-help disconnection (Section 05.5).
Account-level threat (a compromised login): TOTP alone does not help here, since the request looks legitimate to the backend. Required: step-up authentication for relay-triggering actions specifically — a fresh SMS or push confirmation at the moment of that action (e.g., a homeowner’s own budget cutoff, or a landlord’s Bulk Control command), even within an already-logged-in session, the same pattern banks use for money transfers. This closes the gap between “logged in” and “authorized to trigger this specific relay action right now.”
Additional safeguards: rate limiting on relay-command frequency and full audit logging of every command (Section 05.5).
05.5 Extra Features — Landlord / Building Admin Only
Building-Wide Dashboard · Building Summary (rooms, owed, collected) · Bulk Control · Manual Recharge (on a tenant’s behalf) · Send Payment Reminder · Room Management (including a Transfer Device flow: when a tenant moves out, the landlord reassigns that Room’s existing Device ID to the incoming tenant from this same screen, rather than treating it as a new install — restored from the original architecture’s agreed items) · Tenant Management · Revenue Dashboard · Usage Report (per room, by date range) · Building-Wide Alerts · Multi-Property Support · Audit Log (every ON/OFF, recharge, tamper event, timestamped) · Export Reports · Threshold Settings · User Roles.
Legal correction (this reconciliation): the original design included a landlord “Rent/Dues Override” — the ability to cut a tenant’s power specifically for unpaid rent. This has been removed entirely. A landlord forcing a tenant’s power off over a rent dispute is self-help utility disconnection, which is illegal — landlords do not get to act as their own enforcement mechanism for a debt. Cutoff authority is limited to: (a) the account holder themselves, through their own self-service budget/schedule settings, or (b) NEPA/the utility, only through the explicitly disclosed opt-in consent flow in Section 06.4. Bulk Control (turning all rooms on/off, e.g. for building-wide maintenance) is unaffected and remains a landlord capability, since it isn’t a punitive action against one specific tenant’s debt.
What the landlord cannot do — no exceptions: buy units from the platform, sell/resell units to tenants, set the unit price, or take a cut as a middleman. Tenants buy directly from the platform, which alone sets pricing. Even where the landlord acts as a collection point for a pooled payment (Section 07.2), that’s a pass-through, never a markup. The landlord’s power is administrative — cutting a room’s light, sending reminders, forwarding a payment — never commercial.
05.5.1 Dispute Recourse Policy (Corrected — Rent/Dues Override Removed)
The original policy here existed to support a landlord’s Rent/Dues Override, which has been removed entirely (Section 05.5) as illegal self-help disconnection. The Dispute Center’s remaining, legally sound job is narrower and simpler: disputing a specific reading or bill amount, not negotiating around a power cutoff that no longer exists as a landlord tool.
The flow, as it appears in the Dispute Center UI: a tenant or homeowner who believes a reading or bill is wrong taps “Dispute This Bill” → selects the specific period and amount in question → attaches an optional note → the counterparty (landlord, or SmartClamp support for a single-home Basic/Basic Pro dispute against a verification report) receives the dispute and can respond with an explanation, a corrected figure, or an escalation → the full usage log and Verification Report for that period are attached automatically as evidence → resolution is logged in the Audit Log either way. No power is ever cut or restored as part of this flow — that was only ever entangled with the now-removed Override feature, not with legitimate reading disputes.
05.6 Access Methods
Method
Who Uses It
What They See
Device ID entry
Anyone with the printed ID, no smartphone needed
Current usage, current bill, payment options, device status
QR Code scan
Anyone helping the account holder
Same as Device ID
Login (email + password)
Account holder or anyone granted Multi-User/Guest access
Everything their role/hardware allows
The public view (Device ID or QR) deliberately excludes payment history, usage history, tamper alerts, and correlation data — login-only.
05.7 Payment Methods
USSD (dial → enter Device ID → select amount → confirm PIN → SMS confirmation) · App (payment-only) · Website (payment-only) · Bank transfer (Device ID as reference) · Full app/website login for the complete dashboard.
05.8 Smart-Home / Third-Party Device Integration Exploration (New)
Per-socket/per-appliance hardware control was ruled out on cost grounds (Section 03.1) — the same Nigerian branch-wiring topology problem that ended per-appliance relays applies to any attempt to put a relay+microcontroller at every socket. Two paths forward, kept as distinct product concepts:
Path A — software integration with existing smart plugs/bulbs (recommended first step): many budget smart plugs/bulbs sold globally (and reaching Nigerian markets) run on a small number of common backend platforms — notably Tuya and, increasingly, the cross-brand Matter standard. Integrating with these platforms’ APIs would let a customer who already owns a smart plug or bulb link it into the SmartClamp dashboard for unified per-appliance visibility/control, without SmartClamp building or selling any additional hardware — a software/integration project, not a hardware one.
Path B — a future standalone “SmartClamp Socket” accessory: a commodity smart-plug-style product (ESP32 + small relay) that plugs into any existing wall socket rather than being wired into the building’s branch circuits, sold individually for the specific appliances a customer cares about (fridge, AC). Sidesteps the wiring-topology cost problem since it’s not permanently installed. A genuinely separate hardware line — filed alongside Phase 4/5, not part of the current core product.

06. Meter Integration Strategy (Corrected)
06.1 The Opportunity, and the Correction to the Original Framing
The original spec framed this as: “customer enters their meter number → platform links via the meter’s own API → every feature, including remote control, works through software alone.” This overstates what’s realistically achievable and needs correcting.
Read access is genuinely achievable without a partnership: most smart/prepaid meters sold and approved in Nigeria expose an optical port (an infrared interface on the meter face) speaking DLMS/COSEM, the international protocol standard most Nigerian-approved meters use (Momas, Mojec, and others explicitly advertise DLMS-readiness), or a wired Modbus/RS485 output. A lightweight IR-reader add-on can pull a meter’s existing readings into the SmartClamp platform — this is a real, buildable, lower-cost product line for homes that already have a functioning smart meter (no anti-bypass hardware needed there, since the meter’s own hardware already prevents that).
Write/control access (remote disconnect) is a different matter and cannot be built around unilaterally. On STS-compliant meters (mandatory in Nigeria — Section 06.3), disconnect/reconnect commands are gated behind security keys controlled by the manufacturer or the DisCo, specifically to prevent unauthorized third parties from being able to cut someone’s power — a deliberate security feature, not an oversight. Genuine remote-control integration would require a formal partnership or licensing agreement with the specific manufacturer or DisCo, not something achievable purely through the meter’s public-facing interface.
But control doesn’t have to wait for that partnership — a customer can get it today, a different way. A customer who wants remote on/off for a smart-meter home can simply install a standard SmartClamp relay-equipped device (a Pole Device, or House (Full) for a shared room) on the same feed, entirely separate from and not touching the smart meter itself. This is exactly how Section 06.2’s “customer has a normal meter” scenario already works — it now also answers the smart-meter case, so real control is available immediately, not gated on the NEPA/manufacturer partnership in Section 06.4.
06.1a The IR-Reader — Hardware Specification (New Device)
The mechanism that makes the read-only promise in Section 06.1 concrete, not theoretical. Deliberately the simplest device in the entire product line — no relay, no CT, no voltage ADC channels, nothing beyond what’s needed to move a reading from a meter’s optical port to the cloud.
Hardware: a small puck-style unit with an IR photodiode/phototransistor physically aligned to the meter’s existing optical port (a passive, standard read — the same interface DisCo technicians already use to query these meters). A cheap microcontroller is sufficient here — ESP8266-class, not ESP32 — since there are no analog sensor channels to read, so the ESP32’s extra ADC pins (Section 03.6) aren’t needed for this specific device. Powered by a simple wall-adapter/USB connection into a nearby outlet — no self-powered design, no supercapacitor, since it isn’t measuring or switching a live wire itself.
Permanently read-only. Control for a smart-meter customer is never built into the IR-Reader — see above for how control is actually delivered (a separate relay-equipped SmartClamp device on the same feed).
Connectivity — pending a field test, not yet a locked decision:
Preferred path, if verified: a single-hop LoRa connection to whichever nearby device already has a GSM uplink — the customer’s serving Pole Gateway, or the Building Hub in shared housing — reusing connectivity infrastructure that’s already paid for instead of giving every IR-Reader its own SIM. - Regulatory check, already done: Nigeria’s 863–870MHz ISM band doesn’t require a spectrum license for a short-range device like this, but it does require NCC Type Approval (equipment certification) — the same certification already required for the ESP32’s built-in Wi-Fi/Bluetooth and every GSM module already in the BOM. Not a new regulatory hurdle unique to this device, just one more thing folded into certification work that already has to happen anyway. - Important distinction — this is not the rejected LoRa chain (Section 04.6). That rejection was specifically about chaining many hops down a feeder line, where one dead hop takes out everything behind it. This is one private point-to-point hop into a gateway SmartClamp already controls — the same pattern ESP-NOW already uses for same-pole devices, just with a longer-range radio for a case where the IR-Reader isn’t physically close to its Pole/Hub. It doesn’t inherit that rejection’s cascading-failure math. - Genuinely unverified, needs a real bench/field test before this becomes the default: real-world range and wall/obstacle penetration between an indoor meter and the nearest outdoor Pole Gateway or Building Hub. Theoretical LoRa range figures shrink significantly in cluttered indoor/urban conditions — this needs the same kind of on-the-ground test already flagged for the RS485 shared-housing case, not an assumption either way. - Real added cost if this path is adopted: the receiving side (the Pole Gateway or Building Hub) needs its own LoRa radio module added to its own bill of materials to hear the IR-Reader — this isn’t currently spec’d on either device, so adopting this path has a genuine hardware cost implication on top of the IR-Reader itself.
Fallback, already fully proven to work: a dedicated small GSM module directly on the IR-Reader itself (its own SIM, same connectivity pattern as the Pole Gateway) — simpler, no new regulatory or range risk, but adds a small per-unit recurring SIM cost that the LoRa path would avoid if it pans out.
Decision rule: run the LoRa range/reliability test during the Phase 1 pilot. If it holds up, LoRa becomes the production default. If it doesn’t, ship the GSM-module fallback instead. Either way, the IR-Reader ships on schedule — this is an open engineering test with a known fallback already in hand, not a blocking dependency on the whole feature.
06.2 Three Deployment Scenarios (Corrected)
Scenario
What We Do
Customer has a smart meter
Read-only integration via the optical port/DLMS today. Remote control is a Phase 3+ item contingent on a manufacturer/DisCo partnership (Section 06.4) — not promised at launch
Customer has a normal (dumb) meter
Install SmartClamp behind the meter; it reads usage; the platform does the rest
Customer has no meter
Install the full SmartClamp system (Pole ± optional relay, or House (Full) for shared housing)
06.3 The Trust Model for Linked Smart Meters
For a customer with an existing smart meter, SmartClamp doesn’t run its own clamp-based verification chain against it — the meter already has its own manufacturer-provided tamper detection and security. SmartClamp acts as a read layer on top of it, offering usage visibility, scheduling suggestions, and budgeting advice through the app — with any actual power-cutting action, if ever offered, executed only through a formal partnership with that meter’s manufacturer/DisCo, disclosed to the customer (Section 06.4).
06.4 Future NEPA / Manufacturer Partnership Concept — With a Hard Disclosure Requirement
A longer-term vision: if NEPA mandates that approved meter manufacturers (Momas, Mojec, Hexing, Landis+Gyr, and others) provide unified security-key access through the SmartClamp platform, this becomes a genuine single collection/control point across meter brands. This requires a meter integration adapter layer — a per-manufacturer translation module, since DLMS/COSEM security implementations vary by brand — and is entirely dependent on that partnership existing; it cannot be built speculatively ahead of it.
Non-negotiable requirement, regardless of how this partnership develops: any control capability given to NEPA or any third party over a customer’s power must be explicitly disclosed to that customer — never implemented covertly. A customer installing SmartClamp specifically because they don’t fully trust NEPA’s billing would reasonably feel betrayed to later discover the device they installed was quietly giving NEPA a remote disconnect capability the whole time. If this capability is ever built, it ships as a clearly disclosed feature with its own consent flow — not a background permission folded into a partnership agreement.
06.5 What This Requires in Software
Meter Integration API (DLMS/COSEM, Modbus) · Meter Number Linking · Manual Reading Entry (normal meters, no clamp fitted) · Clamp + Meter Pairing (where both exist, extra tamper cross-check) · Unified Dashboard (one view regardless of meter type) · Dual-Tariff Support.
06.6 Competitive Positioning
For smart-meter owners, this makes the platform function like Vendr.ng — software-only, no installation. Unlike a software-only competitor, SmartClamp also serves everyone without a smart meter, via hardware — serving both segments most competitors split into two different markets. Vendr.ng itself has pivoted away from hardware entirely toward software integration with meters people already own, validating this direction while confirming hardware remains SmartClamp’s real point of difference, not something to drop. Vendr also serves estates, malls, hotels, student hostels, and mini-grid/embedded-power operators — worth keeping in view as adjacent markets beyond shared housing and single homes.

06.7 Metered vs. Unmetered — Quick Reference
Scenario
What Happens
Single Home, metered
Pole vs. customer’s existing meter reading = the verification/dispute check (Section 06). No separate SmartClamp billing record needed.
Single Home, unmetered
Pole reading becomes the consumption record used for billing/disputes directly — there is no other reading to compare it against besides the Transformer Monitor.
Shared Housing, metered
Transformer → Pole → Customer meter → House (Full) per room. Pole vs. meter = bypass detection (Section 07.1).
Shared Housing, unmetered
Transformer → Pole (whole-building reading) → House (Full) per room. No meter discrepancy check exists; the whole-building Pole reading becomes the consumption record, split by each room’s measured share (Section 07.2).
Software must support both states in every quadrant — this determines which upstream comparison the Rule Engine (Section 09.2) runs for a given Device or Building.

07. Deployment Models & Payment Architecture
07.0 Who Owns the Gateway — The Infrastructure Model (Restored — a Real Decision, Not Yet Written In)
The company owns and installs Pole Gateway devices as shared infrastructure — customers never buy, manage, or pay for connectivity separately. The GSM/data cost for every Gateway is bundled invisibly into the customer’s subscription fee, sourced through the M2M/IoT pooled SIM data plan (Section 25’s open items — one bulk data account across every Gateway’s SIM, ideally on a multi-network plan for regional coverage reliability). A customer signing up never sees a “buy data” step, never manages a SIM, and never pays a telecom bill directly — connectivity is simply part of what their subscription already covers, the same way a bank doesn’t itemize the cost of its own core banking infrastructure to a customer.
Hybrid retail exception: where the company is not the one physically installing a pole (e.g. a retailer or independent installer bringing SmartClamp to a new area ahead of company rollout), a pole deployment should default to offering both the GSM (Gateway) and non-GSM variants together as a package, rather than requiring the installer to know in advance which single house on that pole should carry the Gateway role. This avoids a stalled or misconfigured install in scenarios the company doesn’t directly control.
07.1 Shared Housing — With Meter (Flagship, Priority MVP)
The model — a meter within a meter: one physical NEPA meter serves the building. The landlord does not buy units and hand them out. Every room has its own House (Full) device with a unique Device ID. A tenant loads money directly onto the building’s central meter, but the purchase is recorded against their own Device ID — not shared, not pooled. Functionally, each room’s device keeps its own independent, private balance that only that room’s usage draws down, even though physically only one meter connects the building to NEPA.
How a room’s light can go off: balance hits zero → relay cuts automatically, no landlord action needed or possible otherwise — see Section 05.5’s legal correction on why a landlord cannot force a room off for any other reason, including unpaid rent.
End-to-end flows: - Normal operation: tenant self-loads units → balance updates live → tenant and landlord both see it. - Low balance → auto-disconnect → recharge: alert at 10% remaining → auto-cut at zero → tenant recharges → power restores automatically. - Theft — bypass attempt: a room at zero balance shows current flowing despite the relay being OFF → tamper alert fires → public broadcast names the room → landlord investigates. - Theft — main meter drift: central meter total vs. sum of all rooms’ usage shows a gap beyond threshold → theft alert → pattern analysis flags the likely suspect (Section 08).
Payment block: 1. User initiates a Recharge (USSD, App, Website, or Bank Transfer), specifying a Device ID and amount. 2. Payment Gateway (Paystack/Flutterwave/OPay) processes it. 3. Webhook idempotency (specified): the payment gateway’s webhook confirmation is keyed to its own unique transaction reference; the backend checks for an existing Transaction record with that exact reference before crediting anything. A gateway retrying the same webhook (a common real-world occurrence) never double-credits a Wallet — this is a standard pattern, not a hypothetical risk to design around later. 4. Backend creates one Transaction record, itemized into three components, never merged: wallet_credit (the unit value), platform_markup (₦5–10/unit, platform revenue only, never landlord revenue), transaction_fee (2–5%, platform revenue). 5. Wallet updates; confirmation SMS/push fires; if the relay was OFF for zero balance, it’s commanded back ON.
07.2 Shared Housing — Without Meter
The model: no landlord meter exists. One whole-building measurement point (the Pole serving that building, or a dedicated whole-building device) reads total incoming current. Every room still has its own full-control House (Full) device, same feature set as the with-meter model.
Billing — collective settlement via the landlord: 1. Every room’s device measures and logs its own actual usage. 2. The whole-building reading captures total building usage. 3. Each room’s app shows its own usage and the building’s total. 4. Real-time self-loading price per unit (specified — a self-correcting formula, not a guess): since a room needs to top up its balance before the next NEPA bill is even known, the per-unit price shown for self-loading is calculated as (landlord's most recent actual NEPA bill ÷ building's total measured kWh over that same period) × a small safety margin, recalculated at the start of every billing cycle. This means the price a tenant pays per unit is always anchored to real, recent billing data, not an estimate pulled from nowhere — and it self-corrects each cycle rather than drifting further from reality over time. 5. At the end of the cycle, each room’s actual share of the real bill is calculated precisely: (room's measured kWh ÷ building's total measured kWh) × building's actual bill amount — any small gap between what was collected via the estimated per-unit price and the final actual share is reconciled into the next cycle’s balance, not lost or absorbed silently. 6. Each room’s contributions accumulate into a pooled wallet; the landlord collects the pooled total and pays NEPA on the building’s behalf, as one payment. 7. Landlord marks the bill paid in-app; the AuditLog records the full chain — who contributed what, when the pool closed, when the landlord confirmed payment.
This is a pass-through, never a markup. Settlement cadence — a running self-funded balance per room vs. a strict per-NEPA-bill reconciliation — remains genuinely unresolved and needs an operational decision before Phase 1 billing-engine work starts (this is distinct from the per-unit pricing formula above, which is now specified).
Adoption constraint: a non-payment disconnection from NEPA cuts the entire building, not one room, since there’s no meter separating individual rooms from the grid. This mode requires building-wide adoption, not a room-by-room rollout.
07.3 Single Home — Basic / Basic Pro (No In-House Device)
One Pole Device measures the home’s total consumption from outside — no relay, no in-house hardware at all. Full logging, correlation against the Transformer, immediate visibility into faults or tampering, Device ID/QR access for helpers, full login for the homeowner, and a verifiable record for disputes. Basic and Basic Pro get everything in Section 05.2 (and Basic Pro adds 05.2.1) — none of that is Pro-gated; only Section 05.3’s control features require Pro.
What Basic’s subscription fee actually pays for: hosting and data storage for usage history, the SMS cost of every alert sent, and standing access to a dispute-ready verified record — independent of whether NEPA integration ever lands. NEPA cooperation (Section 06.4/10.4) is a bonus that makes the record actionable against NEPA specifically; it isn’t what the subscription is paying for in the meantime.
07.4 Single Home — Pro (Relay Added to the Existing Pole Device)
The customer’s own Pole Device (whichever one already serves their house) gets an optional magnetic latching relay added (Section 03.6). Everything in Basic Pro, plus every feature in Section 05.3 (remote ON/OFF, scheduling, self-set budget, restore power, hours-of-light-saved). Verification/tamper detection is unchanged from Basic — the Pole’s comparison against the Transformer Monitor remains the trust mechanism; there is no second in-house device to correlate against (Section 03.1 explains why that’s no longer needed).
07.5 Subscription Billing (Runs Separately From the Electricity Wallet)
On signup, user selects a plan (Basic/Basic Pro/Pro) and billing frequency (monthly/quarterly [-5%]/yearly [-10%]).
Payment Gateway charges on the selected cadence; a failed charge triggers a grace-period notification, not an immediate feature lockout.
Subscription status gates nothing about the electricity Wallet — a lapsed subscription doesn’t cut anyone’s power; it only limits app feature access, so a billing failure never becomes a safety issue.
07.6 Installer / Agent / Referrer Payouts
Trigger
Payout
Installer marks an install complete, confirmed by device coming online
Installer Payout (₦2,000–5,000)
New subscription signed up under an Agent’s code
Agent Payout (₦1,000–2,000)
New signup using a Referrer’s code
Referrer Payout (₦500)
Payouts accrue to a ledger and disburse on a fixed schedule (weekly/monthly) — never instantly per-event, to keep reconciliation clean.
07.7 Known Gap — NEPA Payment Execution
Nothing in this architecture assumes NEPA has a payment API, because it doesn’t. Every flow that ends in “pay NEPA” (Section 07.2, and the future Phase 3 NEPA billing flow) ends at a human action — the landlord or homeowner physically pays, then confirms in-app. The system’s job is to make that payment provably correct, not to execute it automatically. Don’t build toward an assumption that this becomes automatable before Phase 3 confirms otherwise.

08. Unified Theft-Detection & Verification Framework
Every quadrant runs on the same principle: any reading is only trusted if it’s cross-checked against a reading one level up.
08.1 Layer 1 — Hardware Tamper Detection
Clamp removed (current → zero while relay ON); relay bypassed (relay OFF but current > 0); clamp loosened (fluctuating readings); device offline (no heartbeat 24hrs). Applies everywhere.
08.2 Layer 2 — Relay vs. Current Correlation
Relay OFF + Current > 0 → bypassed. Relay ON + Current = 0 → clamp removed/wire cut. Relay ON + Current = normal → all good. Applies to any relay-equipped device.
08.3 Layer 3 — Upstream Drift Detection
Quadrant
What’s Compared
Trigger
Shared Housing (with meter)
Central meter total vs. sum of all room balances/usage
Drift beyond threshold → theft alert
Shared Housing (no meter)
Whole-building reading vs. sum of room readings
Drift beyond threshold → theft alert
Single Home (Basic/Basic Pro/Pro)
Transformer log vs. Pole reading
Mismatch → tampering
Meter Integration, with clamp fitted
Clamp reading vs. linked meter reading
Mismatch → tampering
Meter Integration, meter only
Inherits the meter’s own built-in tamper detection (Section 06.3)
N/A
Superseded: the original spec’s “Single Home Pro: Master vs. Sub, both vs. Transformer” row no longer applies — see Section 03.1 for why the Sub device concept was retired.
08.4 Layer 4 — Pattern Analysis
Room A usage drops sharply while Room B spikes → suspect A is drawing off B’s wire. A room at several times its historical average → possibly tapped into a neighbor’s wire. Zero balance but usage continues → bypassed relay. Device offline >24hrs → removed or interfered with. Applies primarily where multiple rooms/devices allow cross-comparison. This is automated, threshold-based comparison logic — it runs continuously as data arrives (every few minutes wherever GSM connectivity exists), not a manual monthly review. Deeper behavioral/ML-based anomaly detection is a Phase 4 item (Section 10.6), appropriately separate from this core real-time loop.
08.5 Layer 5 — Public Accountability
Public dashboard, public tamper alerts, self-policing, full transparency, deterrence — everyone sees the same data, so anyone tampering knows they’ll be caught and exposed.
08.5.5 Device & SIM Theft Tracking (New — Protects the Hardware Itself, Not Just What It Measures)
Everything above protects against tampering with readings. This layer protects against someone stealing the device itself.
Device location, without adding a GPS chip: rather than a dedicated GPS module (real added cost for something a fixed installation doesn’t usually need), each GSM-equipped device (Pole Gateway, Building Hub) uses its existing GSM module’s cell-tower ID (Cell ID/LAC) as a free location fingerprint, captured once at install as the baseline. Since these are fixed installations that never move under normal operation, any change in that fingerprint after install is itself the tamper signal — a device suddenly reporting from a different cell tower means it’s been physically removed and relocated. Zero added hardware cost, since the GSM module already has this information as a normal part of connecting to the network.
SIM theft — the real fix removes the motive, not just the opportunity. A physically hidden SIM compartment only raises the effort needed to steal a SIM; it doesn’t make the SIM worthless once removed. The actual fix: IMEI-lock every SIM to the specific device it was issued to, via the M2M SIM platform (Section 11’s tech stack). A SIM that only functions when paired with the exact device IMEI it was provisioned for is worthless to a thief in any other device — there’s no longer a reason to steal it in the first place. Combined with the same platform’s geofencing/anomaly alerts (a SIM suddenly appearing paired with a different IMEI, or connecting from a cell tower far outside its expected home tower, triggers an immediate alert), this is a stronger defense than physical concealment alone. A hidden physical compartment can remain as a minor secondary deterrent, but it’s no longer the thing actually doing the security work.
Response to a detected tamper or theft: an urgent installer/ops-dispatch alert (visible on the Internal Ops Dashboard, Section 12.6), not an automatic community-wide cutoff. Pole Devices keep working locally via ESP-NOW regardless of one device’s GSM status, so the real impact of a single stolen/tampered device is delayed data sync for that one device, not lost service for its neighbors.
08.6 The Trust Chain
LEVEL 1 — TRANSFORMER MONITOR    logs when power is available · source of truth · NEPA has direct access (Phase 3+)         ▼ must align withLEVEL 2 — POLE (Gateway / Device)    logs all electricity entering the house or building         ▼ must align withLEVEL 3 — CUSTOMER METER (if present) or HOUSE (FULL) DEVICE (shared housing rooms)
Rule: if any level doesn’t align, tampering is detected.

09. System Architecture — Entities (Reconciled Naming)
09.1 Core Entities
Entity
What It Represents
User
Any account: Tenant, Landlord/Admin, Homeowner, Installer, Agent, Referrer, or NEPA/Utility staff (role stored on the account)
Building
A shared-housing property; carries meter_type: with_meter \| no_meter, owned by a Landlord User
Room
Belongs to a Building; carries occupancy status; linked to exactly one House (Full) Device
Device
The physical unit — Device ID, role (Transformer \| PoleGateway \| PoleDevice \| HouseFull \| BuildingHub \| IRReader), has_relay, has_voltage_sensor, owning User, optional Room/Building link, optional linked Meter. Device ID generation, specified: IDs are randomly generated — never sequential, and never derivable from install date, order number, or any other predictable source — specifically to prevent someone from enumerating other customers’ public Device ID views (Section 05.6) by guessing nearby IDs.
LinkedMeter
A third-party smart meter connected via Section 06 — meter number, protocol, optionally paired with a Device for cross-checking
Wallet
A balance tied to one Device (individual) or one Building (pooled, no-meter quadrant). Designed utility-agnostic from Phase 1 — the Wallet’s schema carries a utility-type field (electricity by default) even though electricity is the only type active before Phase 5, so water/gas (Section 10.6) plug into the same balance/payment model later rather than requiring a redesign — restored from the original architecture’s agreed items
UsageEvent
A timestamped reading from a Device or LinkedMeter — the raw data everything else is built from
Transaction
Any money movement: recharge, subscription charge, transaction fee, platform markup, payout
Bill
A generated statement — per Device (with-meter), per Building (no-meter, collective), or per House (Single Home + NEPA, Phase 3)
Schedule
Time-based ON/OFF rules attached to a relay-equipped Device
Budget
Self-set monthly spending limit attached to a relay-equipped Device
Alert
A generated notification, tied to a rule, dispatched via SMS/App
Dispute
A user-submitted challenge, referencing specific UsageEvents and a Bill, with the negotiation flow in Section 05.5.1
AuditLog
Immutable, timestamped record of every control action and payment, scoped to a Building or Device
Payout
An earned amount owed to an Installer, Agent, or Referrer, tied to the triggering event
CommandToken (new)
The TOTP/HMAC rotating token attached to any relay-triggering command (Section 05.4) — logged alongside the AuditLog entry it authorized
09.2 The Master Flow
Device (clamp) → measures current/voltage      ↓ signs payload with device key (Section 11's Device Identity & Security)Cloud Backend → verifies signature → stores as UsageEvent      ↓Rule Engine → checks UsageEvent against:   · Wallet balance (relay-equipped devices)         → triggers relay command if 0   · Budget limit (if set)                            → triggers relay command if hit   · Schedule (if set)                                → triggers relay command at set time   · Upstream reading (meter-within-meter,             → triggers Alert (tamper/drift)     transformer, or pole-vs-house comparison, Part 08)      ↓Any relay command → attaches a CommandToken (Section 05.4) → device verifies before acting      ↓Alert dispatched (SMS + App) where a rule fires      ↓App/Dashboard reads UsageEvent + Wallet + Alert history in real time
Nothing in this system trusts a single reading, or a single command, in isolation.
09.3 What Links to What, by Quadrant
Quadrant
Device(s)
Wallet Model
Upstream Check
Shared Housing, with meter
One House (Full) per Room
Individual Wallet per Room, self-loaded
Building’s total meter vs. sum of Room Wallets
Shared Housing, no meter
One House (Full) per Room + one whole-building reading point
Pooled Wallet per Building, routed through Landlord
Whole-building reading vs. sum of Room readings
Single Home Basic/Basic Pro
One Pole Device (no relay)
None — no billing flow at all
Pole vs. Transformer Monitor
Single Home Pro
Same Pole Device, with relay added
Individual Wallet on the Pole Device
Pole vs. Transformer Monitor (unchanged from Basic — no second in-house device)
Meter Integration (linked smart meter, no clamp)
None (LinkedMeter only)
Individual Wallet, if the meter supports it
None — inherits the meter’s own built-in security
Meter Integration (linked meter + our clamp)
One Pole/House Device
Individual Wallet
Clamp reading vs. LinkedMeter reading

10. Phased Roadmap
The hardware doesn’t change across phases — a Basic device has no relay and a Pro device does, from day one. What’s phased is the software. One app, one codebase throughout — features turn on as each phase ships, based on what a user’s hardware and subscription allow.
10.0 The Free Tier Changes the Build Order — Read This Before Phase 0
The Free tier (Section 05.1) only works as an acquisition strategy if it exists before anyone needs to buy hardware, not two phases after. So Meter Integration is split into three pieces that ship at different times, not one Phase 2 item:
Free Meter Validation (confirms a meter number is real/active, shows name/address — no live balance) — pulled forward into Phase 0, ships alongside or even before the physical clamp prototype, since it requires no hardware and no IR-Reader at all — just a bill-payment aggregator API lookup and a bare-bones homepage field.
IR-Reader hardware + live balance/history (Section 06.1a) — ships in Phase 1, once the core billing/account platform exists to actually hold and display that live data meaningfully.
Full Meter Integration (dual-tariff billing, manual reading entry, clamp+meter cross-checking, and Basic Pro’s deeper analytics layered on top of a linked meter) stays in Phase 2, once the core platform and paying-customer features already exist.
This is the one place in the roadmap where a “later phase” feature has an early, deliberately simplified version shipping much sooner — because its job in Phase 0 is customer acquisition through an honest, limited interaction, not feature completeness.
10.1 Phase 0 — Foundation (MVP)
Builds: the Free Meter Validation utility (Section 10.0 — no signup, no hardware, confirms a meter number is real/active); hardware prototype (Pole + Transformer, ESP32-based); basic firmware (reads current, sends data); basic cloud backend; a simple app (usage view + ON/OFF command where relay-equipped); manual/admin unit allocation; the minimal Internal Ops Dashboard (Section 12.6’s Phase 0 tier — basic fleet health list, manual allocation tools, raw error log), built alongside the customer-facing MVP rather than deferred, since the team needs some operational visibility from the very first device in the field. Works: the free validation lookup, live and public, independent of hardware readiness; measure usage per house once hardware ships; remote ON/OFF where relay present; basic cloud storage; simple dashboard; enough internal visibility to run the pilot without flying blind. Not yet: self-set budget, schedule power, pattern study, full meter integration (dual-tariff, deep analytics), IR-Reader, transformer correlation at scale, NEPA dashboard, SMS notifications, subscription payment, device identity signing, ESP-NOW/RS485 multi-device chains, Building Hub, the full Internal Ops Dashboard.
10.2 Phase 1 — Core Features
Builds: full firmware (offline storage, tamper detection, overload protection, ESP-NOW same-pole linking, RS485 shared-housing linking, BLE installer provisioning — Section 12.5); device identity & security (per-device signing, plus TOTP/HMAC command security and step-up auth for relay-triggering actions — Section 05.4); device/SIM theft tracking (Section 08.5.5 — cell-tower-ID fingerprinting, IMEI-lock, geofencing); full backend (accounts, device pairing, billing engine, utility-agnostic Wallet schema — Section 09.1); complete app (every Open Feature and every Hardware-Gated Feature, including Basic Pro’s nine analytics features mapped to their screens in Section 05.2.1); room/tenant management including the Transfer Device flow (Section 05.5); the Verification Report public microsite (Section 15.0); “Meeting Mode” for in-person disputes (Section 05.2); the Dispute Center’s reading/bill dispute flow (Section 05.5.1); Installer Portal diagnostics (signal strength, sensor test, pairing confirmation — Section 12.5); the IR-Reader (Section 06.1a) and its live-balance upgrade to the Free tier; SMS notifications; payment integration; basic transformer correlation using SmartClamp’s own Transformer Monitor; the full Internal Ops Dashboard (Section 12.6, panels A–K). Works: everything in Phase 0, plus the full feature set described above, for every quadrant, plus a complete internal operating view of the fleet, revenue, disputes, and compliance status. Not yet: third-party meter integration beyond IR-Reader validation, smart-home device linking, dual-tariff billing, STS compliance, full NEPA dashboard, AI-driven pattern study, multi-utility, the Ops Dashboard’s Phase 2+ scale panels (Geographic Tracker, Vendor/Partner Tracker).
10.3 Phase 2 — Third-Party Meter Integration (Deepens the IR-Reader Into a Full Paid Layer)
Builds: the full API gateway for meters (DLMS/COSEM via optical port, Modbus) underneath the IR-Reader that’s been live since Phase 1; dual-tariff billing support; unified dashboard merging linked-meter data with the rest of the app; manual reading entry; clamp + meter pairing for cross-checked tamper detection where both exist; Basic Pro’s analytics layer (Section 05.2.1) extended to work on linked-meter data, not just SmartClamp’s own devices; the Internal Ops Dashboard’s Geographic/Regional Expansion Tracker and Vendor/Partner Relationship Tracker (Section 12.6, Phase 2+ panels), once there’s more than one pilot area to make them meaningful. Works: everything in Phases 0–1, plus the IR-Reader now upgrading in place into dual-tariff billing, deeper analytics, and manual reading entry for customers who choose to subscribe — no separate app or re-signup needed, since it’s the same account the Free/IR-Reader tier was already using. Not yet: remote control of third-party meters via the meter’s own manufacturer (requires the Section 06.4 partnership — remote control via a separate SmartClamp relay device is already available since Phase 1), full NEPA dashboard, STS compliance, AI-driven pattern study, multi-utility.
10.4 Phase 3 — NEPA Integration & Transformer Verification
Builds: transformer monitor hardware at scale; transformer dashboard; correlation engine; full multi-layer tamper detection; NEPA dashboard (per region/community); broadcast system; disconnection list generation; STS compliance; the meter integration adapter layer (Section 06.4) if a manufacturer/NEPA partnership is in place — with the disclosure requirement in Section 06.4 non-negotiable for any control capability this unlocks. Works: everything in Phases 0–2, plus full transformer verification, NEPA dashboard and broadcast, STS-compliant data, the complete tamper-detection chain. Not yet: AI-driven pattern study/forecasting at scale, usage benchmarking at scale, multi-utility.
10.5 Phase 4 — Analytics & Scale
Builds: upgrades Pattern Study (live since Phase 1) with AI-driven forecasting, anomaly detection, savings recommendations, now meaningful at scale; multi-property management for landlords with 100+ properties; a white-label option for other companies to rebrand the platform; the “SmartClamp Socket” smart-plug accessory (Section 05.8, Path B) as a candidate new hardware line; revisit the rejected LoRa-chain connectivity model (Section 04.6) if the simpler model needs further cost optimization at scale. Works: everything at scale, with AI-driven insight layered on top of the same features that have existed since Phase 1.
10.6 Phase 5 — Multi-Utility Expansion
Goal: extend the platform beyond electricity, following Vendr.ng’s model (Section 06.6). Builds: water and gas token vending, as a software-only addition to the existing wallet/payment/dashboard layer — no new clamp hardware required, since this is a separate business line from electricity metering. Works: everything in Phases 0–4, plus water and gas utilities on the same account and app.

11. Recommended Tech Stack
Proposed, not yet decided — for the team to confirm or adjust.
Layer
Suggestion
Device firmware
C++ on ESP32 (corrected from ESP8266), OTA update support, EEPROM/flash for offline storage
Device ↔ Cloud
MQTT (e.g. via an MQTT broker or AWS IoT Core) or HTTPS REST for telemetry and commands
Same-pole device link
ESP-NOW (built into ESP32’s Wi-Fi radio, new)
Shared-housing room ↔ hub link
Wired RS485 (new)
Backend API
Node.js/Express (or similar) REST API
Relational data (users, billing, devices)
PostgreSQL
Time-series data (usage telemetry)
TimescaleDB or InfluxDB
Mobile app
React Native or Flutter — one codebase, feature-flagged by hardware/subscription
Web dashboard (Landlord/NEPA)
React
Payments
Paystack / Flutterwave / OPay APIs
USSD / SMS
Decided: Africa’s Talking, Phase 1 — a single aggregator contract covers both USSD and SMS rather than two separate vendor relationships
M2M/IoT SIM connectivity (Pole/Building Hub GSM)
Decided: a multi-network IoT SIM aggregator with Nigeria coverage (e.g. Telnyx-class platform) rather than negotiating separately with MTN/Airtel/9mobile — one contract, automatic carrier failover if one network is weak in an area. This same platform is also where the IMEI-lock and geofencing security features (Section 08.6) live
Meter integration (Phase 2)
DLMS/COSEM (optical port) and Modbus protocol libraries/gateway
Auth
JWT-based auth, role-based access control (Tenant/Landlord/Admin/NEPA)
Hosting
Any major cloud provider (AWS/GCP/Azure) — pick based on Nigeria latency and cost
11.1 Device Identity & Security (Expanded)
Every device is provisioned at manufacture with its public Device ID plus a private device key, burned into firmware and never user-visible. Every payload it sends to the cloud is signed with that key (or sent over a per-device authenticated token via HTTPS/TLS), and the backend verifies the signature before accepting any reading — the same trust model IoT platforms like AWS IoT Core use with per-device X.509 certificates.
Added in reconciliation, not in the original spec: - TOTP/HMAC command authentication (Section 05.4) for every relay-triggering command, distinct from the device-identity signing above. - Step-up authentication for relay-triggering actions specifically (a homeowner’s own budget/schedule change, or a landlord’s Bulk Control), protecting against a compromised account/session rather than a forged device payload. - Secure Boot + Flash Encryption on every ESP32, preventing extraction of the device’s private key even with physical access to a stolen or opened unit — necessary given devices sit on public poles and inside tenant rooms outside company control. - BLE-based installer provisioning, keeping initial device setup (Device ID assignment, network credentials) off any network until the device is deliberately connected.

12. Information Architecture — Screens
12.1 Public View (Device ID entry or QR scan — no login)
One screen: current usage, current bill, device/room status (ON/OFF), a pay button. Nothing else.
12.2 Room Owner / Tenant / Homeowner App (Logged In)
Screen
Contains
Home/Dashboard
Live usage (Watts), remaining balance, device status, quick links to Pay, Schedule, Alerts
Usage History
Daily/weekly/monthly graphs, Pattern Study insights (+ Basic Pro analytics where subscribed)
Billing & Payments
Current bill, payment history, recharge, auto-recharge toggle, generator cost share, export data
Control
Remote ON/OFF, Schedule setup, Self-Set Budget setup, Restore Power — Pro tier only, elements simply don’t render otherwise
Alerts
Feed of every notification type
Community
Public dashboard, public tamper alerts, report suspicious activity
Dispute Center
Usage log (visual timeline), bill breakdown, dispute form, evidence download, negotiation flow (Section 05.5.1)
Settings
Profile, notification preferences, linked Device ID, linked smart meter (if applicable)
12.3 Landlord / Building Admin App (Logged In)
Screen
Contains
Building Dashboard
All rooms overview, statuses, building summary
Room Management
Add/remove tenant, assign room, drill into a room’s own detail view (includes the Transfer Device flow, Section 05.5)
Bulk Control
Turn all rooms ON/OFF, building-wide schedule (with step-up auth, Section 05.4)
Revenue Dashboard
Collected/owed, export reports
Audit Log
Timestamped building-wide event feed
Multi-Property Switcher
Switch between managed buildings
Settings
Threshold settings, notification preferences, user roles
No-meter buildings additionally show the Pooled Wallet status prominently — how much has been contributed vs. how much is needed before the landlord needs to pay NEPA.
12.4 NEPA Dashboard (Phase 3, if integrated)
Screen
Contains
Community Overview
All houses, transformer log
Correlation & Tamper
Flagged houses, tamper count
Billing & Broadcast
Generate bills, send broadcast messages, disconnection list
12.5 Device Pairing / Install Flow (Reconciled — Single-Device, Not Two)
The original two-device Master+Sub pairing flow for Single Home Pro is retired. Reconciled flow: 1. Installer connects to the brand-new, not-yet-networked device over Bluetooth (BLE) using the Installer app (Section 03.3) — this is where Wi-Fi/GSM network credentials and the Device ID assignment actually happen, before the device has any internet connection of its own. 2. Installer runs on-device diagnostics from the same app — signal strength check, a live sensor-reading test (confirming the CT/voltage sensor is actually picking up current), and a pairing confirmation — restoring the original architecture’s agreed “Installer diagnostic tools” item, now with a concrete home (the Installer Portal, Site Map #16) and a concrete mechanism (BLE, Section 03.3). 3. Once the diagnostics pass and the device is online, the customer’s own app: scans/enters the Device ID → app confirms it’s talking to the device (live signal check) → names the device (e.g. “Room 3,” “Main House”) → device appears live on the relevant Dashboard within seconds.
Upgrade path (Basic/Basic Pro → Pro): no new device purchase or pairing flow required if the customer’s existing Pole Device supports the optional relay add-on retrofit; otherwise, an installer visit adds the relay module to the existing enclosure, using the same BLE diagnostic flow above to confirm it. The account’s subscription plan changes and Pro features appear immediately on the same login — this is simpler than the original spec’s “order a Sub device” flow.
12.5.1 Physical Installation Safety Protocol (Specified)
Standard low-voltage electrical work practice, not a novel procedure: insulated tools rated for the wire’s voltage class at every step; installer PPE (gloves, eye protection) worn at all times during any clamp installation; and critically, a qualified electrician — not just the installer — handles the actual clamp closure on any wire that has not first been de-energized. The BLE-based configuration and diagnostic steps (above) can be done by a trained installer without an electrician present; the moment of physically closing a CT clamp around a live wire is the one step reserved for someone electrically qualified to do it safely. This distinction should be explicit in installer training material, not left implicit.

12.6 Internal Ops & Fleet Dashboard (Company-Only — New, Previously Missing Entirely)
Every dashboard specified so far is customer-facing (Tenant, Landlord, NEPA). Nothing existed for the company’s own operations, engineering, finance, and support teams to actually run the business day to day — this closes that gap, and closes it thoroughly rather than minimally, since this is the one page whose users are the company itself and whose value compounds with every panel it has.
Built the same way as the customer-facing app: one codebase, panels turn on progressively by phase — not deferred as a single “later” project, but growing alongside the MVP from Phase 0 onward, since the company needs some operational visibility from the very first device in the field, not just once the product is fully built.
Phase 0 (MVP) — The Minimum Ops View That Has to Exist From Day One
Fleet Health, basic: every prototype device, online/offline status, last heartbeat — a simple list, no map yet.
Manual allocation tools: since Phase 0 has no billing engine yet, whoever is running the pilot needs a basic screen to manually assign units/balances to test devices.
Raw error log: backend and device-communication failures, unfiltered — enough to debug the prototype, not yet categorized or trended.
Phase 1 (Core Features) — The Dashboard Becomes a Real Operating Tool
A. Fleet Health - Every device across every type (Transformer Monitor, Pole Gateway, Pole Device, House (Full), Building Hub, IR-Reader), online/offline status, now with a map view by physical location (using the cell-tower-ID fingerprint from Section 08.5.5 for GSM devices). - Last heartbeat per device; sortable by longest-offline, to surface what needs a truck roll first. - Firmware version distribution across the fleet — how many devices are on the latest build vs. lagging, tracking OTA rollout progress (Section 04.4). - GSM signal strength per device, and per-SIM data usage this billing cycle vs. the plan cap (Section 11’s M2M platform), aggregated to a fleet-wide total against the telecom contract’s overall cap. - Devices with an unusually high outage-report frequency — surfaces potentially failing hardware, not just tamper events. - Device provenance/lifecycle tracker (new): manufacture batch, install date, installer who paired it (Section 12.5’s BLE flow), and every firmware version it’s ever run — a full history per physical unit, useful the day a specific batch turns out to have a hardware defect and needs tracing.
B. Alerts & Tamper Feed (Company-Wide) - Real-time feed of every tamper alert across every customer/building (Section 08’s five layers plus 08.5.5’s device/SIM theft layer), filterable by type, severity, and region/building. - Time-to-response tracking per alert: time from alert fired to ops/installer dispatch to resolution. - False-positive rate per alert type and per specific device (expanded from the original spec) — tracking this per-device, not just per-alert-type, surfaces individual miscalibrated units, not just badly-tuned thresholds generally. - Data completeness score per device (new): what percentage of expected readings actually arrived on schedule — a device that’s “online” but silently dropping readings is a different problem than one that’s fully offline, and this is the only way to see that distinction.
C. Adoption & Growth - Total buildings/homes onboarded, trended over time. - Adoption rate within the active pilot area — houses onboarded ÷ total addressable houses in that specific area (Section 19.3). - Tier breakdown: Free / Basic / Basic Pro / Pro / Landlord accounts, and movement between tiers (upgrades/downgrades). - Churn/cancellation rate and reasons where captured. - Installer/Agent/Referrer leaderboard, with outstanding payout liability. - Acquisition funnel, stage by stage (new): homepage meter-validation lookups → account signups → hardware installs → paid-tier conversions — a drop-off view at every stage, not just a final adoption count, so the team can see exactly where prospective customers are being lost. - Channel attribution (new): which acquisition path (installer-driven, referral, direct/organic, future paid) each customer came through, feeding directly into the CAC-by-channel KPI (Section 22) rather than that KPI being calculated by hand elsewhere.
D. Revenue & Payments (Company-Wide) - Aggregated revenue by stream: hardware sales, subscriptions (by tier), transaction fees, unit markup, installer/agent payout costs netted out. - Payment gateway reconciliation: successful vs. failed vs. pending transactions across Paystack/Flutterwave/OPay, surfaced as a discrepancy list, not just a total — this is also where Section 07.1’s webhook-idempotency safeguard becomes visible if it’s ever actually needed. - Total customer prepaid wallet balance held platform-wide — the company’s outstanding liability to customers, a number finance needs visibility into, not just per-device balances. - Pending installer/agent/referrer payout queue and disbursement schedule status (Section 07.6). - Unit economics, live (new): CAC and payback period calculated continuously from the funnel/channel data in panel C, rather than recomputed manually each time someone asks — the same numbers feeding Section 22’s KPIs, always current. - Burn rate and runway (new): monthly cash outflow against current balance, projected months of runway remaining — the single number a founder or investor is most likely to ask for on short notice.
E. Disputes & Support - Open disputes count, average time-to-resolution, breakdown by quadrant (with-meter/no-meter/single-home). - Support ticket volume/backlog if a helpdesk tool is integrated.
F. Error & Exception Logs - Backend application errors, device-communication failures, failed OTA update attempts, failed payment-webhook deliveries — this is where Section 07.1’s idempotency handling becomes verifiably visible, not just theoretically working.
G. Compliance Tracker - A checklist view of every EXTERNAL item (Section 25) — NDPR, STS certification, pole access, NEPA partnership — with status and next action, turning those from something living only in this document into something the team actually tracks to closure. - Certification/contract expiry calendar (new): NCC Type Approval renewals (Section 06.1a), insurance, and any time-bound legal document, surfaced with advance warning rather than discovered on the expiry date.
H. Field Ops - Pending install queue, installer performance (installs/day, BLE diagnostic pass/fail rate at pairing, Section 12.5), and device decommission/RMA tracking.
I. Inventory & Supply Chain (new — not in the original correction, a genuine gap) - Stock levels per component and per finished device type (Transformer, Pole Gateway, Pole Device, House (Full), Building Hub, IR-Reader, and the small parts from Section 03.7.1 — relays, CTs, resistors, capacitors), with reorder alerts before a stockout blocks installs. - Supplier lead times and landed-cost tracking per shipment, feeding directly back into the pricing re-costing work flagged in Section 17.
J. Feature Flag / Rollout Control (new) - Since the customer-facing app is one codebase with features turned on by phase and tier (Section 10’s stated build philosophy), ops needs the actual control panel for that — toggling a feature on for a specific pilot area or a specific tier before a wider rollout, without needing a new app release for every phase gate.
K. Internal Access Audit (new — an NDPR accountability requirement, not just a nice-to-have) - A log of which staff member viewed or exported customer data, and when — the company’s own accountability record for the personal/usage data it holds (Section 16’s NDPR consideration), distinct from the customer-facing AuditLog, which only covers actions on a customer’s own account.
Access control: role-gated (super-admin, ops, finance, support, engineering, and a read-only view for anyone who just needs the numbers) — internal-only, never a customer-facing page, and itself subject to panel K’s own access logging.
Phase 2+ — Panels That Only Make Sense Once the Business Has Scale
L. Geographic/Regional Expansion Tracker: per-region adoption %, per-region DisCo/tariff differences, per-region NEPA relationship status — meaningless with one pilot area, essential once there are several.
M. Vendor/Partner Relationship Tracker: telco contract status/usage against cap, payment gateway relationship health, installer/agent contractor status at a portfolio level rather than the individual view in panel C.

13. Site Map — Full Page Inventory
#
Page
Phase
1
Home
0
2
How It Works
0
3
For Landlords / Shared Housing
0
4
For Homeowners (Basic/Basic Pro/Pro)
0
5
Already Have a Smart Meter? (Meter validation + IR-Reader pitch)
0 (validation) / 1 (IR-Reader)
5b
IR-Reader Order/Setup Flow (Section 06.1a)
1
6
Pricing
0
7
Sign Up (role-aware)
0
8
Log In
0
9
Tenant/Room-Owner Dashboard
0
10
Landlord/Admin Dashboard
0
11
Homeowner Dashboard (Basic/Basic Pro/Pro view)
0
12
Device Pairing / Install Flow
0
13
Public Device View (Device ID/QR — no login)
0
14
Dispute Center
1
15
Settings & Account
0
16
Installer/Agent/Referrer Portal
1
16b
Internal Ops & Fleet Dashboard (Section 12.6, internal-only)
0 (minimal) → 1 (full) → 2+ (scale panels)
17
About
0
18
Contact / Support
0
19
FAQs
0
20
Terms & Conditions
0
21
Privacy Policy
0
22
Meter Linking Flow (read-only integration — see Section 06.1)
2
22b
Verification Report — Public Microsite (signed, timestamped, shareable, no login)
1
23
NEPA/Utility Dashboard (restricted access)
3
23b
Utility Control Consent (Section 06.4’s disclosure requirement — shown before any NEPA/utility remote-control capability is ever activated on a customer’s account; opt-in only, revocable)
3
24
Multi-Property Dashboard
4
25
White-Label Admin Console
4
25b
Linked Smart Devices (Settings sub-page — Tuya/Matter smart plug/bulb linking, Section 05.8 Path A)
2
26
Water/Gas Token Vending
5
32 pages/screens total across the full roadmap (30 from the prior reconciliation pass, plus the IR-Reader Order/Setup Flow and the Internal Ops & Fleet Dashboard added in this pass) — 25 exist in some form by the end of Phase 1, since the Ops Dashboard’s minimal Phase 0 version and full Phase 1 version count as one evolving page, not two.

14. Phase 0 & 1 — Full Build Spec (Sections Carried Forward Unchanged Except Where Noted)
14.1 Home Page — Section by Section
Nav bar — Logo (left), How It Works · For Landlords · For Homeowners · Pricing (center), Validate Your Meter (no signup) · Log In · Sign Up (right). Transparent over hero, solidifies on scroll.
Hero — Problem Slider — 3–4 auto-rotating/swipeable slides on a frosted-glass panel, each a punchy problem statement with a supporting illustration, e.g. “Why should you pay the same as your neighbor’s fridge?” Persistent CTA below is a direct meter-number input field, not just a “Sign Up” button — a visitor with an existing smart meter can type their meter number right on the homepage and instantly see it’s confirmed as a real, active meter with the name/address on file. This is the single most important conversion point on the entire homepage (Section 05.1, Section 10.0) — it lets someone experience a real, immediate interaction with SmartClamp before ever committing to an account. This validation step is honest about its own limit — a follow-up line (“Want live balance and history? Add the free-standing IR-Reader, or sign up to start tracking”) is shown immediately after a successful lookup, rather than implying full balance access is already happening.
Product Demo — Live/animated dashboard mockup: usage graph animating upward, a toggle flipping a light off with a relay-click cue, a balance ticking down live.
How It Works — 4 Steps — Icon-led: Clip it on → Connects to the cloud → See & control from your phone → Get a verified, fair bill. A secondary, smaller “Already have a smart meter? Try it free above” callout sits near this section too, so the free entry point isn’t only visible at the very top.
Who It’s For — Segmented Cards — SHARED HOUSING/“For Landlords,” SINGLE HOME/“For Homeowners,” ALREADY SMART/“Have a Meter Already? — Try it free, no clamp needed” (this card’s CTA goes straight to the meter-lookup field, not to Sign Up, since Free requires no account).
Trust Strip — 3-minute install · 5-layer theft detection · Works with or without a meter · No NEPA cooperation required to start.
Social Proof — Placeholder until pilot data exists: “Piloting now in the FUTA area — results coming soon.” Do not fabricate testimonials.
Pricing Preview — Four teaser cards (Free/Basic/Pro/For Landlords), headline price only — Free’s card reads “₦0 — no clamp needed.”
Final CTA — Mirror/glass panel repeat, one closing line, Sign Up.
Footer — Product/Support/Company links, contact/social, compliance disclaimer (Section 16).
14.2 Sign Up — Role-Aware Entry
One /signup page, first question: “What are you setting up?” — four tap targets. (The Free tier deliberately has no entry here — it’s accessible directly from the homepage’s meter-lookup field with no account at all; an account only becomes useful for Free users once they want history saved across visits, at which point a lightweight account can be created from within that same lookup flow, not from this page.)
A. Landlord/Shared Housing: account basics → Create Building (name, address, meter_type) → Add Rooms → schedule installs or self-install → invite tenants → set building defaults → Landlord Dashboard.
B. Tenant/Room-Owner: arrives via invite link/QR/Device ID → account basics → auto-linked to Room and Device → prompted to add a recharge method (skippable) → Tenant Dashboard, live from the first reading.
C. Homeowner — Basic/Basic Pro: purchase/order flow → Device Pairing (single Pole Device) → account basics → subscription selection → Homeowner Dashboard (read-only feature set in full).
D. Homeowner — Pro (reconciled — single device, not Master+Sub): same as C, with the Pole Device’s optional relay confirmed active during pairing → subscription selection (Pro) unlocks the full control set immediately.
Upgrade path (Basic/Basic Pro → Pro): no new account, no second device pairing flow — see Section 12.5.
E. Installer/Agent/Referrer: account basics + payout details. Installer: short verification/training step before job assignment. Agent/Referrer: immediate unique code, no gate.
NEPA/Utility (Phase 3) is not self-serve — accounts created by platform admins as part of a formal partnership, scoped to a specific region.
14.3 Tenant/Room-Owner Dashboard
Top: live usage gauge + remaining balance, large and unmissable. Quick actions row: Pay/Recharge, Schedule (if relay-capable), Budget (if relay-capable), Restore Power (only if currently cut). Middle: usage graph (daily/weekly/monthly toggle). Recent Alerts: short list, most recent first, linking to Dispute Center where relevant. Bottom nav: Home · History · Community · Settings.
14.4 Landlord/Admin Dashboard
Top: Building Summary strip (rooms, collected, owed, tamper flags — red badge if any). Room grid: every room as a card, status color-coded, tap to drill in. Bulk actions bar. Side panel: Revenue Dashboard, Audit Log, Tenant Management, Settings. No-meter buildings additionally show Pooled Wallet status prominently.
14.5 Homeowner Dashboard (Basic/Basic Pro/Pro)
Basic/Basic Pro: usage graph, transformer-correlation status (“✅ Verified” or “⚠️ Mismatch”), verification report download, dispute tools, plus Basic Pro’s deeper analytics where subscribed. No control widgets at all — greyed-out buttons for things the tier can’t do should not render. Pro: everything above, plus the same Control quick-actions row as the Tenant Dashboard.
14.6 Public Device View (No Login)
One screen: current usage, current bill, device status, a Pay button. Nothing else renders.
14.7 Dispute Center
Usage log (visual timeline, not a raw table), bill breakdown, a short dispute form, an evidence-download button producing the Verification Report, and the negotiation flow from Section 05.5.1.
14.8 Terms, Privacy, Footer Disclaimer
Terms & Conditions and Privacy Policy are text-first pages, no imagery needed. Every page’s footer carries: “SmartClamp provides sub-metering and verification technology. It does not generate, resell, or distribute electricity, and does not replace your utility meter.”

15. Phase 2–5 Deltas (Carried Forward, With Section 06’s Correction Applied)
15.0 Phase 1 Addition — Verification Report Microsite
New page: Verification Report — Public Microsite (Site Map #22b) — a signed, timestamped, read-only URL generated per device, viewable with no login by anyone holding the link. Ships alongside the Verification Report feature itself (Section 05.2), not deferred to a later phase, since it requires no new hardware or third-party dependency — restoring an agreed item from the original architecture.
15.1 Phase 2 — Meter Integration
New page: Meter Linking Flow — enter meter number → platform verifies via the read-only Meter Integration API (Section 06.5) → live confirmation the link is active → returns into the same Dashboard layouts, fed by LinkedMeter data. New homepage page: “Already Have a Smart Meter?” Dashboard delta: dual-tariff rate display added where a linked meter reports it. New Settings sub-page: Linked Smart Devices (Site Map #25b) — Tuya/Matter smart plug/bulb linking (Section 05.8, Path A), grouped into this phase alongside meter integration since both are software-only integrations with hardware the customer already owns.
15.2 Phase 3 — NEPA Integration & Transformer Verification
New restricted page: NEPA/Utility Dashboard (Section 12.4). New page, gating any control feature this phase introduces: Utility Control Consent (Site Map #23b) — an explicit, opt-in, revocable consent screen a customer must actively accept before any NEPA/utility remote-disconnect capability is ever active on their account; this screen is not optional or skippable if such a capability ships, per Section 06.4’s disclosure requirement. Dashboard delta (Homeowner): a “NEPA-verified” badge once Phase 3 is live and the home’s data is actively used in NEPA’s billing. New notification type: NEPA broadcast messages surface in the existing Alerts feed.
15.3 Phase 4 — Analytics & Scale
Dashboard delta: Pattern Study gains AI-driven forecasting and anomaly callouts, same visual slot. New page: Multi-Property Dashboard. New page: White-Label Admin Console.
15.4 Phase 5 — Multi-Utility Expansion
New page: Water/Gas Token Vending — same Wallet/Recharge/Payment blocks (Section 07), applied to a new utility type, no new clamp hardware. Dashboard delta: a utility-type switcher appears once a user has more than one utility linked.

16. Permissions & Regulatory Considerations
Not legal advice — a map of where to get real legal counsel before each phase, not after.
NDPR (Nigeria Data Protection Regulation): the platform collects personal, usage/behavioral, and payment data from day one — an NDPR compliance review belongs in Phase 0, not retrofitted later.
Payment handling: don’t hold user funds directly; route every recharge and subscription charge through a licensed processor (Paystack/Flutterwave/OPay) — the standard way apps at this stage avoid needing their own CBN payment license. Confirm with counsel before Phase 1 launches real payments.
Sub-metering / electricity regulation (NERC): verify where SmartClamp sits relative to NERC’s Meter Asset Provider framework. Safest positioning, mirroring Vendr.ng’s public framing: “SmartClamp provides sub-metering and verification technology; it does not generate, resell, or distribute electricity, and does not replace a utility meter.” Appears in the site footer and Terms of Service from Phase 1.
Tenancy/consumer protection law — RESOLVED: the original design’s landlord “Rent/Dues Override” (cutting a tenant’s power for unpaid rent) was reviewed and removed entirely (Section 05.5) — self-help disconnection of this kind is illegal, full stop, not a gray area needing further review. Reasoning kept here for the record rather than silently deleted, so nobody reintroduces it without knowing why it was removed. The remaining auto-disconnect logic (a room’s own balance hitting zero, which the account holder controls themselves by not recharging) is a different, legally sound mechanic and is unaffected. New consideration from this reconciliation: any future utility (NEPA) remote-disconnect capability (Section 06.4) needs its own explicit counsel review given the disclosure requirement and the trust implications for a product whose value proposition is partly built on independence from NEPA.
SMS/USSD: requires a licensed telecom aggregator partnership (e.g. Africa’s Talking, Termii) — a contract to have in place before Phase 1’s notification system goes live.
STS compliance (Phase 3): worth scoping the certification process well before Phase 3 starts, since certification timelines can run long.

17. Business Model — Revenue Streams (Flagged for Re-Costing)
The hardware changes in this reconciliation (ESP32, latching relay, ESP-NOW/RS485 replacing a flat Wi-Fi assumption, the Building Hub as a new device, single-home Pro no longer needing a second in-house device) mean the original ₦ figures below need re-costing before being finalized — carried forward as the prior baseline, not as confirmed final pricing.
Revenue Stream
Amount (prior baseline — needs re-costing)
How Often
Who Pays
Hardware (Basic/Basic Pro)
₦10,000
Once
Basic/Basic Pro users
Hardware (Pro)
₦16,000
Once
Pro users
Installation
₦2,000–5,000
Once
All users
Subscription (Basic)
₦1,000/month
Monthly
Basic users
Subscription (Basic Pro)
(new tier — not yet priced)
Monthly
Basic Pro users
Subscription (Pro)
₦2,000/month
Monthly
Pro users
Transaction fee
2–5%
Per payment
All users
Unit markup
₦5–10/unit
Per unit
All self-load purchases
This resolves the earlier open question about markup: the unit markup is a platform-level revenue stream, not a landlord one — the platform sets the price and takes the margin; landlords cannot buy, resell, or arbitrage units at all.
Subscription payment flexibility: Monthly (no discount), Quarterly (5%), Yearly (10%).
Installer/Agent/Referrer model: Installer ₦2,000–5,000/install; Agent ₦1,000–2,000/signup; Referrer ₦500/referral.

18. Brand & Visual Direction (Carried Forward Unchanged)
18.1 Tone & Vibe
The audience is landlords and homeowners, not students — but the site shouldn’t look like a utility company’s static portal either. Direction: confident, modern, slightly premium fintech-adjacent — the visual energy that makes a banking app or a well-funded African fintech feel current, applied to something as unglamorous as electricity.
18.2 Color System
Role
Color
Where It Shows Up
Primary
Deep navy
Headers, nav bar, primary buttons, logo
Accent — Insight/Premium
Amber/gold
Highlighted callouts, Pro-tier UI accents, hero gradient warmth
Accent — Confirmed/Safe
Green
Success states, “verified” badges, resolved statuses, ON states
Accent — Risk/Alert
Soft red
Tamper alerts, disconnection warnings, error states
Neutral
Off-white / light grey
Backgrounds, cards, breathing room
18.3 Visual & Motion Language
Glass/mirror surfaces (frosted-glass hero/key cards with a soft reflection). Prism accents (navy → amber → green gradient light-streaks at transitions and hover states). Motion: scroll-triggered fade/slide-ins, animated stat counters, a live-ticking demo widget, physical-flip toggle animations. Restraint rule: every effect should feel purposeful — the device clipping onto a wire and just working is the core magic; the UI shouldn’t fight that simplicity with clutter.
18.4 Where Images/Graphs Belong
Use visuals
Keep it text/data
Hero, “How It Works” steps, “Who It’s For” cards, product demo, stats strip
Pricing tables, legal/compliance text, dispute/evidence detail views, settings screens
Every dashboard’s usage numbers → always a live graph/gauge
Notification/alert text — short, factual, no decoration
Device install steps → photos/illustrations per step
Terms & Conditions, Privacy Policy pages
18.5 Positioning Statement — Decided
“Electricity you can verify — with or without a meter.” Chosen over the other two candidates specifically because it states the actual product mechanism instead of a mood — this matters most in the moment that matters most: explaining the product to a skeptical landlord who’s never heard of it. (“The trust layer for every wire in Nigeria” and “Know your power. Control your power. Prove your power.” remain good secondary taglines for marketing contexts where mood matters more than mechanism — e.g., a billboard or a social post — but the primary positioning statement used in direct sales and onboarding is the one above.)
18.6 Three-Word Essence — Options
Measure. Verify. Control.
Clip. Trust. Save.
See. Prove. Control.

19. Target Market & Pilot Sequence (Carried Forward Unchanged)
19.1 Primary Market
Landlords and homeowners in shared or single-occupancy housing across Nigeria — a situation-defined audience: anyone currently unable to verify or fairly split an electricity bill.
19.2 Why Houses, Not Estates, First
Estates and large managed properties (Vendr’s core market) require procurement cycles, board approval, and existing facility-management relationships. Individual houses and small shared buildings decide fast, feel the unfairness personally, and don’t need anyone’s permission but the landlord’s.
19.3 Pilot Sequence
Based in FUTA — the pilot starts with houses in the FUTA-adjacent area, not students; the product is not student-focused, FUTA is simply the founders’ home base and controlled testing ground.
Stage
Scope
Entry
A small number of shared-housing buildings (with-meter model, the flagship) around FUTA — controlled environment, documented outcomes, direct founder involvement in every install
Proof
Expand within the same city to a second, independently-referred building — tests whether the model sells itself without founder hand-holding
Open Access
City-wide availability once the with-meter flagship is proven — installer network activates
Expansion
Adjacent cities in the same state → state-wide → other major Nigerian cities → single-home rollout once Phase 1 SMS/billing infrastructure is proven → NEPA conversations begin once there’s enough verified data to make the case

20. Go-To-Market Plan (Carried Forward Unchanged)
Stage
Primary Channel
Entry (FUTA-area pilot)
Direct founder outreach to landlords, door-to-door and personal network
Proof
Referral from the first pilot building’s landlord — the strongest possible lead source
Open Access
Installer network becomes the primary growth engine — installers incentivized to sell, not just install
Expansion
Agent/referrer network activates city by city; paid acquisition only once organic/referral CAC is well understood

21. Team & Hiring Plan (Carried Forward — Placeholder)
Founder input needed — replace with actual names/roles before this document goes to anyone external.
Phase
Roles Likely Needed
0
Firmware/hardware lead, founder(s) handling everything else
1
Backend engineer, mobile/web frontend engineer, part-time/founder customer support
2
Integrations engineer (meter protocols)
3
Compliance/regulatory lead (part-time or counsel), partnerships lead (NEPA relationship)
4
Data/ML engineer, additional support/ops as building count scales
5
New business-line lead (water/gas)

22. KPIs & Success Metrics (Carried Forward)
Category
Metric
Adoption
Buildings/homes onboarded per month; installer-driven vs. direct signups
Retention
Monthly subscription churn; Wallet recharge frequency (engagement proxy)
Revenue
MRR from subscriptions; markup + transaction fee revenue per active Wallet
Unit economics
CAC by channel (referral vs. installer vs. paid); payback period
Trust/Product
Theft incidents detected vs. resolved; average dispute resolution time; % of buildings with zero unresolved tamper flags
Satisfaction
NPS or equivalent, sampled quarterly

23. Risks & Contingency Plans (Not Just a Risk List — an If-This-Then-That Plan for Each)
The original risk list named problems without a plan for what happens if each one actually occurs. Expanded here into a real contingency framework, so the team isn’t figuring out a response for the first time under pressure.
Risk
If It Happens, The Plan Is
Confidence This Plan Works
NEPA declines any partnership (Phase 3+)
The entire business model already works without NEPA (Shared Housing with-meter is the flagship, and Free/Basic/Basic Pro/Pro all function on SmartClamp’s own verification chain). If NEPA never cooperates, Phase 3’s NEPA-specific features (unified dashboard, disconnection lists) simply never ship — nothing before Phase 3 breaks or needs redesigning.
High — this is a genuine “nice to have, not load-bearing” dependency by design
Pole access is denied (NEPA or property owner refuses to let a Pole device be mounted)
Fall back to mounting the Pole Device at the property boundary/wall closest to the incoming service line, rather than on the actual utility pole — slightly less ideal for anti-bypass positioning (a tap between the true pole and the wall would go undetected) but still functional for consumption measurement and billing. Flag this explicitly to the customer as a reduced-assurance install, not a silent downgrade.
Medium — workable, but genuinely weaker on the anti-bypass guarantee specifically; worth exploring a formal access agreement with property owners/DisCos before this becomes a frequent workaround rather than an exception
A meter manufacturer refuses to share security keys (Section 06.4)
Read-only integration (Section 06.1) never required their cooperation and continues regardless. Remote-control integration simply doesn’t ship for that manufacturer’s meters — the platform can state plainly which brands support control and which don’t, rather than blocking the whole feature on universal manufacturer buy-in.
High — the read/control split was designed specifically so this failure mode is contained, not catastrophic
Relay component sourcing falls through (exact part unavailable, landed cost too high)
The component class (magnetic latching relay, IEC 62055-31/UC3) is a standard, multi-supplier category, not a single-vendor dependency — if one supplier/part number doesn’t work out, the same specification can be sourced from another manufacturer in the same class.
High — this is a sourcing/logistics problem, not a design dead-end
No-meter Shared Housing can’t reach building-wide adoption
This mode simply doesn’t get sold to that building — the with-meter flagship model (Section 07.1) doesn’t have this constraint and remains the default recommendation; no-meter is explicitly the harder-sell secondary option, not something the business depends on succeeding everywhere.
High — already priced into the go-to-market sequencing (Section 19–20) as the flagship-first approach
A Landlord fails to remit a pooled payment to NEPA (no-meter model)
The full audit trail (Section 09.1) shows exactly what was collected and when, which protects tenants from being blamed unfairly and gives the platform a documented basis to flag that specific landlord — but the platform cannot itself force the payment, since it never touches NEPA’s own systems. This is a real limit of the no-meter model, not something software alone resolves — worth factoring into whether no-meter buildings need a stricter landlord vetting process than with-meter ones.
Medium — mitigated, not eliminated; worth revisiting once real usage data shows how often this actually happens
Any future NEPA/utility control capability damages trust in the “independent from NEPA” positioning
The disclosure requirement (Section 06.4) is the primary defense — but as a secondary safeguard, this capability should launch as strictly opt-in with a visible, easy toggle to revoke it at any time, and marketed as something NEPA gained access to through SmartClamp’s mediation (with SmartClamp retaining audit visibility over its use), not something NEPA can act on unilaterally. Consider customer research before committing, as flagged in the original risk note.
Medium — this is more a positioning/communication challenge than a technical one, and deserves real customer input, not just an internal decision
Device identity spoofing / command forgery
Per-device signing plus TOTP/step-up command security (Section 05.4) are the primary defenses, but a full third-party security review before Phase 1’s payment/control flows go live is the actual risk-closing step — this line item is a reminder that the review still needs to happen, not that it already has.
Medium until the review is actually completed
Wired RS485 underperforms in real shared-housing buildings
If a specific building’s wiring path makes RS485 unreliable, the fallback is a local Wi-Fi mesh between room devices and the Building Hub for that specific building only — a per-building exception, not a redesign of the standard approach, since most buildings should not need it.
Medium — untested; this is exactly what the Section 25 open item (RS485 field test) needs to resolve before scaling past a handful of buildings

24. Competitive Advantage (Carried Forward)
Competitor
What They Do
Why SmartClamp Is Better
Vendr.ng
Software for existing smart meters
We serve that same segment via Section 06 — and also everyone without a smart meter, via hardware
Official Smart Meters
Expensive, per-room installation
Dramatically cheaper per room
Big Box V3
Centralized control, requires rewiring
Clips on, minutes-long installation
Momas Meters
Requires approved installation
Plug-and-play, no approvals needed
Prepaid Meters (Standard)
Requires an individual meter per room
Cheaper, easier to install, includes remote control

24.5 Forward-Looking Opportunities (Consultant Pass — Proposals, Not Decisions)
Everything in this section is a new suggestion offered for consideration, not something agreed or decided anywhere in this chat. It’s kept in its own section, clearly separated from settled architecture, so it never gets mistaken for a requirement a builder must implement.
Alternative credit-data product (restores an idea raised earlier that didn’t make it into the settled feature list): a long, verified, tamper-evident history of on-time payments and consistent usage (Section 05.2.1’s hash-chained audit trail already produces exactly this kind of record) is, itself, valuable data. With explicit customer consent, this history could eventually be offered to lenders as an alternative credit-scoring input for underbanked customers who lack conventional credit history — a genuine byproduct of data the platform is already collecting for other reasons, not a new data-collection effort. Candidate for Phase 4, once enough verified history exists across enough customers to be meaningful, and only ever opt-in.
Energy-efficiency before/after audit: since Basic Pro already detects individual appliance load signatures (Section 05.2.1), the platform could let a customer flag “I just replaced my AC/fridge” and automatically show a clean before/after usage comparison — turning an existing analytics feature into a tangible, shareable proof point (“switching appliances saved me X naira/month”) that doubles as organic marketing content. Low additional engineering cost, since it reuses data already being collected.
Data-informed group purchasing (Phase 5+, more speculative): because the platform knows real, verified usage patterns across many households on the same pole or in the same area, it’s in an unusually good position to identify, say, a cluster of houses that would all benefit from a specific size of solar/inverter setup, and could facilitate a group purchase or financing arrangement with a hardware partner. This is a genuinely new business line, not a feature — flagged here as a direction worth exploring once there’s enough usage data to make the matching meaningful, not something to build early.

25. Open Items — Consolidated
Most items that were open before this pass are now resolved and have been removed from this list — see the relevant section for each. What remains falls into two honest categories: real engineering/field-test work still to do, and items where the company’s position is already decided and written down; only an outside party’s approval remains (marked EXTERNAL below — this is a normal boundary between planning and building, not a documentation gap).
Item
Status
Wired RS485 field test through real shared-housing ceiling/wall runs
Needs site test
IR-Reader connectivity: single-hop LoRa vs. GSM-module fallback (Section 06.1a)
Needs a real bench/field range test during the Phase 1 pilot — decision rule already set: LoRa if it holds up, GSM fallback if not, either way the IR-Reader ships
Final subscription/hardware pricing across all four tiers
Needs re-costing against corrected hardware (Section 17)
Shared Housing (no meter) settlement cadence — running balance vs. per-bill reconciliation
Carried forward from the original spec, still genuinely unresolved
EXTERNAL — Pole access permission
Pending the pole-owning entity/DisCo; company’s request is ready to make, not pending internal decision
EXTERNAL — NEPA/manufacturer partnership for unified meter key access
Pending NEPA/manufacturer cooperation; the disclosure requirement (Section 06.4) is locked regardless of how or whether this happens
EXTERNAL — NDPR, payment-licensing structure, sub-metering/NERC positioning
Company’s stated position is already written (Section 16); pending formal legal counsel confirmation
EXTERNAL — STS certification (Phase 3)
Pending certification body timeline; scoping should start in Phase 2 so it’s ready in time
Resolved this pass (previously listed here, now decided and reflected in their home section): exact latching relay part class (Section 03.6 — JS201-series, IEC 62055-31/UC3, landed cost is now a normal procurement step, not an open design question), single-home peak amperage tier (Section 03.4 — confirmed 60A max, well within the Pole’s already-spec’d 100A CT headroom), Telco M2M/IoT SIM plan structure (Section 03.3/25 — a multi-network IoT SIM aggregator, decided), who installs devices (Section 10 — Phase 1 in-house/founder-led, Installer/Agent network formally begins Phase 2), no-connectivity-area collection method (Section 04.7 — monthly handheld collection by default), physical clamp/CT installation safety protocol (Section 12.5 — specified), ESP-NOW firmware-update chunking (Section 04.4 — specified as a standard OTA pattern), and the positioning statement (Section 18.5 — decided).
26. Final Summary
Question
Answer
What is it?
A self-powered device family — and a software platform for existing smart meters — that measures usage, verifies it against a trusted source, controls power where enabled, and supports billing, across shared buildings and standalone homes
What problem does it solve?
Unfair bills, manual tracking, theft, landlord-tenant disputes, appliance damage from bad voltage, and — for homes without any smart meter — the total absence of a way to verify what you’re billed for
What can it do?
Measure, verify, control (where enabled), bill, detect theft in 5 layers, protect appliances predictively, schedule power, set a self-managed budget, study usage patterns, work offline, and integrate (read-only, initially) with third-party meters
What makes money?
Hardware sale, subscription (three tiers, with quarterly/yearly discounts), a platform-level unit markup, transaction fees, and an installer/agent/referrer network
NEPA dependency?
None required for Shared Housing (with meter) — the priority MVP. Optional, Phase 3 upside for the no-meter tiers and full community verification — any control capability that emerges from this is subject to a hard disclosure requirement (Section 06.4)
What’s the build order?
Hardware is essentially fixed from Phase 1 (ESP32, latching relay, ESP-NOW/RS485 connectivity); software ships in five phases — MVP, Core Features, Meter Integration, NEPA/Transformer Verification, then Analytics & Scale
One-Sentence Summary: SmartClamp is a self-powered device family and software platform that measures electricity usage, verifies it against a trusted source — its own Pole device, a linked smart meter, or a transformer log — and lets rooms and homes control power, manage a budget, dispute bills, and stay protected, all from one phone app, built out in phases on hardware that stays fundamentally stable from Phase 1 onward.
End of reconciled master document.