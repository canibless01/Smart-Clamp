# Validation evidence
Current cloud machine,2026-11-09. Run `bash tools/verify.sh` after `python3 -m pip install -r tools/requirements.txt`; needs C++17 compiler and OpenSSL development headers/library.

Passed on this machine:
- Source transcription SHA256 integrity and uploaded YAML checksum; Markdown local-link checks;48 page specifications and48 unique route-registry entries.
- Canonical contracts/openapi.yaml passed OpenAPI3.0 semantic validation:128 operations with unique operation IDs. Historical source has64 operations and remains byte-preserved.
- Five Python protocol tests: golden vector, tampering, wrong key/target/epoch, expiry/replay/policy, forbidden float/noncanonical encoding.
- C++17 core suite compiled -Wall -Wextra -Werror: profile capabilities, real power/VA/PF, energy-gap rejection, voltage/stable restore, command expiry/replay and commissioning/feedback rules.
- C++17 runtime suite: supply lost/returned, initial unknown preboot intent cannot restore ON, voltage protection, recharge clears only its own restriction, budget/manual conflicts, feedback unknown and durable-store failure.
- C++17/OpenSSL crypto suite: same signed envelope vector as Python, base64url encoding, signature tamper/length and malformed identity rejection. ESP32 path uses mbedTLS and has not been run on target hardware.
- Before original reset: backup archive read back and compared against original files including Git HEAD; regenerable node_modules/.next excluded.

Blocked/unrun:
- ESP32 cross-compilation: earlier PlatformIO registry CONNECT returned403 for api.registry.platformio.org. No compiled ESP32 binaries are claimed. CI now includes a separate six-profile bench build job; its result must be inspected after GitHub runs it. A successful bench build would still not validate physical adapters.
- Actual ADC/metrology, relay driver, power-fail journal, ESP-NOW/RS485/GSM/IR/BLE, secure-boot/OTA and on-device qualification. Main Arduino entrypoint remains bench-only. New policy/runtime/crypto libraries do not provide these missing adapters.
- Database migrations/RLS execution, deployed API, real provider sandbox end-to-end, website UI/browser tests and physical integration are not implemented/tested. Original prototype tests do not validate the replacement.

Git publication is verified separately through remote main SHA after push. No deployment, hardware flashing, cloud publication or Git history rewrite is part of these checks. CI configuration is committed but not evidence that remote CI has passed.
