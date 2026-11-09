# ESP32 firmware: shared policy + six bench targets
Status: tested portable core and bench application, **not complete production device firmware**. Never upload this expecting metering, payment protection, GSM, or relay operation. No pin is actuated; measurement stays null. This prevents unknown wiring from being energized while providing a compilable basis for all six roles.

Build: `cd firmware && pio run` with PlatformIO 6.1.18 (install in an external venv). Select `-e pole_gateway` etc. Serial: 115200. Native core tests are listed in root README. Target reference: classic dual-core ESP32 DevKit/ESP32-WROOM-32, not ESP8266, ESP32-C3 or an assumed universal ESP32 pinout. C++ Arduino framework runs safety task on core1, network task on core0. Hardware acceleration, TLS, secure boot and flash encryption require actual integrations/configuration, not just two tasks.

## One codebase, six products
| Profile | Metering | Local link | Uplink | Relay |
|---|---|---|---|---|
| transformer | transformer-rated CT + voltage; three-phase design must be specified if applicable | deployment-specific | GSM optional, otherwise engineered gateway | never |
| pole_gateway | two 100A-class CT channels + voltage | ESP-NOW peers | one cellular uplink | optional commissioned Pro |
| pole_device | same pole sensors | ESP-NOW gateway | forwarded | optional commissioned Pro |
| house_full | one room-rated CT + voltage | wired RS485 | Building Hub | mandatory hardware, disabled until commissioned |
| building_hub | no sensors | RS485 master | GSM | never |
| ir_reader | optical meter protocol, not CT | proposed LoRa or GSM fallback | selected after field test | never |

Single-home Pro is a capability variant of pole_gateway/pole_device, not a seventh physical role. A GSM modem is not needed in every unit. Device credentials belong to end devices even when another unit forwards packets. Gateways need per-device queues, acknowledgments and fair scheduling; hub is not a metering unit.

## Proposed pin allocation (not active in code)
For a classic esp32dev board only; physically verify before wiring. ADC1 avoids Wi-Fi/ADC2 conflict.
| Function | Proposed GPIO | Notes |
|---|---|---|
| CT1 | 34 | input-only; isolated conditioned analog, bias and burden per CT SKU |
| CT2 on pole | 35 | same; not needed by house |
| voltage waveform | 32 | ZMPT101B output must be conditioned to ADC-safe range |
| external Hall alert | 33 | voltage-compatible digital output |
| outage sense | 39 | input-only; external bias and isolated power-fail circuit |
| relay OPEN/CLOSE | 25 / 26 | transistor/H-bridge coil driver, never coil directly; reserved inactive |
| auxiliary relay feedback | 27 | isolated contact feedback, not inferred from command |
| modem UART RX/TX | 16 / 17 | classic WROOM reference; conflicts with some PSRAM boards |
| RS485 UART RX/TX/DE | 18 / 19 / 21 | external 3.3V transceiver and terminated bus |
| LED | 23 | series resistor; board-specific |

IR optical UART, LoRa SPI, modem PWRKEY and transformer multiphase ADC are intentionally unassigned until module/board confirmation. Do not connect RS485 and an IR receiver to an overlapping UART. Avoid boot strap pins and GPIO6–11 flash bus. Do not attach mains or unconditioned sensor outputs to ESP32. Qualified electrical design must cover isolation, protection, surge and enclosure; clip-on CT measurement does not make voltage/relay installation safe live work.

## Already implemented
Role capability matrix; calibrated-waveform true power/VA/PF computation; energy integration with explicit gap rejection; voltage bounds 180–250V; five-minute stable restore gate; command expiry/sequence/device/auth policy; commissioning and feedback gate. Host tests cover these. A successful policy decision never changes physical observed state by itself.

## Remaining implementation by dependency
1. Calibrated simultaneous acquisition/phase correction at measured sample rate, RMS over whole mains cycles, clipping/error detection; transformer phase arrangement. CT open-circuit protection and analog calibration are hardware work.
2. Latching-relay nonblocking bounded pulse driver using real coil specs and auxiliary feedback, interlocks/watchdog, protection persistence and reconnection hysteresis. No generic digitalWrite relay assumption.
3. Append-only flash/FRAM journal with CRC, wear budget, bounded queue, power-cut atomicity and durable acknowledgment; preserve energy/sequence across reset. Do not rewrite full EEPROM on every sample.
4. ESP-NOW encrypted provisioned peer addressing/channel management, packet authentication, fragmentation/dedupe/backpressure; RS485 master polling, framed length/address/sequence/payload/CRC, turnaround timing and collision-free slave responses. Gateway transport must never block safety task.
5. Modem adapter per actual SIM800/SIM7000 model, verified carrier band coverage and TLS capability, APN/proxy/cert trust, NITZ confidence and backoff. If modem TLS cannot meet policy, use a verified secure stack/appropriate modem, never disable verification. SMS fallback is notification only, not an unauthenticated control channel.
6. Device provisioning (unique ID/key, trusted peers, calibration, topology) through authenticated installer BLE, encrypted secret storage; trusted clock resync via gateway/hub. Secrets never printed or embedded in shared source.
7. Exact signed ingress/command contract, keyed HMAC constant-time verification of device+arguments+expiry+sequence; durable replay counter before pulse; separate signing keys/directions, rotation; server authorization and user step-up. Portable core's signatureValid argument is a policy test input, NOT cryptography.
8. Optical driver for approved meter model (DLMS/COSEM authorization and protocol framing), additional LoRa hardware and range test or GSM variant. Do not implement a fictional universal IR UART meter.
9. Signed OTA, rollback health checks and chunking for local links; actual secure boot/flash encryption provisioning and key recovery procedure. Disabling serial output is not secret protection.
10. Commission end-to-end backend queues/payment/control protocol in provider sandbox, then electrical bench. Test internet loss, gateway failure, corrupt flash, counter rollback, clock loss, forged/replayed commands, voltage events, feedback mismatch and power interruption mid-write/pulse/OTA. No release before these pass.

The owner clarified that existing hardware uses an unspecified generic ESP32, and GSM variants are not built. A photo and old Blynk sketch can inform the board mapping, but cannot replace a confirmed wiring diagram/BOM or measured calibration. Virtual pins are Blynk concepts; the replacement uses authenticated physical telemetry and command records. No Blynk token belongs in this foundation.

## Revision2 reference extensions
include/runtime.hpp now encodes the outage/recovery lifecycle, durable event/command adapter boundaries, independent OFF-reason set, safe preboot intent recovery and feedback checks. include/crypto.hpp implements protocol-v1 HMAC-SHA256 envelope signatures with mbedTLS on Arduino/OpenSSL for host tests; both Python and C++ verify the same public test vector. include/hardware_config.hpp centralizes proposed pins and calibration placeholders; HardwareQualified remains false. Read HARDWARE-CONFIG.md, ../docs/POWER-LOSS.md and ../contracts/device-protocol.md before adapting hardware. Run all native/contract suites with bash tools/verify.sh from repository root. No physical adapter completion or target compilation is implied by these additions.
