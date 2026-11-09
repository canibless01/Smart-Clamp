# Gap closure log
These are explicit foundation decisions to close broken loops, not claims hardware/cloud integrations already exist. See LOOP-CATALOG for executable behavior requirements.

| Gap/conflict | Chosen closure | Loop |
|---|---|---|
| Loss of power also removes reporting power | last-gasp durable record, delayed backfill, confidence bounds; no promise of live SMS | L03/04 |
| Transformer alone vs individual house totals | topology-versioned complete aggregates, matched windows and coverage | L06 |
| Pole and Building Hub relationship unclear | independent GSM streams; only cloud correlation, no invented local radio connection | L02 |
| Gateway ACK could lose child data | only cloud durable event ACK authorizes deletion | L02/05 |
| Device still consuming during GSM loss | explicit delayed-accounting exposure; offline allowance capability gated | L05/08 |
| Payment succeeds but central meter top-up fails | money paid, vending, reserved credit and usable credit separated | L07 |
| Recharge automatically restores unsafe circuit | set of independent OFF reasons; all must clear | L09/10 |
| Automation needs SMS on each firing | step-up creates revocable bounded delegated policy | L10 |
| Source's plans conflict with House Full control | room prepaid/service capability separate from homeowner Pro entitlement | L11 |
| Landlord transfers old tenant's data accidentally | immutable occupancy intervals, revoke new access, history preserved | L01 |
| Source TOTP authenticates time, not action body | command HMAC binds exact content+target+expiry+sequence and persistent counter | L09 |
| Source public tamper feed risks false accusations | private investigation first, privacy-safe reviewed aggregate publication | L06 |
| Same source has mismatched ops panel mapping/page count | master A–M exact mapping; 31 listed primary entries +9 supporting screens | ACCESS-MATRIX |
| Power V×I mislabelled as real power | sampled mean(v*i), phase calibration, separate VA/PF and quality | DOMAIN-RULES |
| Generic circuit image has ESP8266 + non-latching relay | legacy reference only; classic ESP32 profile and qualified latching driver | firmware/HARDWARE-CONFIG.md |
| Need all documents but builder cannot read Word | searchable full source transcriptions and source hashes in repo | docs/sources |
| No main branch in remote | create main from current checkout history; no force-push or other branch deletion | Git handoff |

Deferred integrations have deliberate unavailable contracts, not fake success: utility vending vendor credentials, DLMS meter model/security association, Matter commissioner/fabric gateway, LoRa radio and range, multi-network SIM provider, approved firmware signing/secure boot manufacture. All can be built against typed adapters and simulators; field activation requires external facts. Default no-meter settlement decision is per-bill reconciliation; activation requires business signoff and published rates. No further UX decision is required to begin building the stated shared-meter workflow.
