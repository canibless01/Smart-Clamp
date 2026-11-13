# Firmware delivery and commissioning runbook

The update backend is implemented. The ESP32 build now includes an actual TLS commissioning agent and signed OTA verification code. This still is **not** complete flash-and-operate metering/control firmware. Production sensing, GSM, ESP-NOW/RS485 HALs, last-gasp power-loss storage and optical adapters remain unintegrated. Never mark a device qualified merely to make an update test succeed.

## Keys and service configuration

1. Create a private local directory: `mkdir -p .runtime`.
2. Run `python tools/bootstrap_secrets.py --output-dir .runtime/secrets`. It creates distinct RSA-3072 firmware/report key pairs and a Fernet device-secret encryption key, with private permissions. It refuses overwrite. Back up these keys securely; changing the device encryption key loses access to stored device credentials.
3. Load the generated server settings securely. With Docker Compose set `SMARTCLAMP_SECRETS_DIR=./.runtime/secrets`, `OTA_SIGNING_KEY_FILE=/run/smartclamp-secrets/firmware-private.pem` and `REPORT_SIGNING_KEY_FILE=/run/smartclamp-secrets/reports-private.pem`. Compose mounts that directory read-only; private keys are never copied into images or browser code. Other hosts use private secret-file mounts and their actual paths.
4. Keep `OTA_ENABLED=false` until partition/signature/rollback qualification. `REPORT_SIGNING_KEY_FILE` enables actual report issuance independently. Configure the real database/Auth/providers from the server template and run migrations through 022. `python tools/check_config.py --database` checks formats and applied SQL checksums; it cannot approve merchants/hardware.

## First ESP32 cloud connection

Register a unique device with `tools/provision_device.py` as documented in the README. Keep its private identity bundle off Git. Prepare a separate private JSON transport file with `wifi_ssid`, `wifi_password`, `tls_ca_pem` (actual API trust anchor), and optionally `ota_public_key_pem` (the **public** firmware key). No compiled fleet credential or insecure TLS mode exists.

```sh
python tools/prepare_firmware_config.py --identity /private/device.device-provisioning.json --transport /private/network.json --output firmware/data/device.json
cd firmware
pio run -e house_full
pio run -e house_full -t buildfs
```

Select the actual role, not universally `house_full`. On a confirmed board, initial wired flashing uploads the matching application and LittleFS provisioning image using the board's verified port/flash layout. Do not upload a filesystem image over an operating device: it can erase queued evidence and credentials. The tool explicitly leaves `commissioned=false`, `calibration_status=uncalibrated`, `ota_qualified=false`.

The commissioning agent validates TLS using the provisioned CA, uses provisioning time only as a TLS bootstrap hint, obtains request-bound HMAC-signed server time, sends signed heartbeats and retries immutable LittleFS records. It removes a record only after an exact durable cloud ACK. Control requests are rejected as `hardware_unqualified`; it does not invent a relay observation or sensor value. Wi-Fi is an actual bring-up transport, not a claim that the specified GSM/local-link deployment is implemented. Without a valid private filesystem configuration it remains electrically inert and reports unprovisioned status.

## Operator update loop

1. Build the application for its exact profile/board. Upload the application `firmware.bin`, **not** `bootloader.bin`, a merged flash image, filesystem image or partition table.
2. Open `/ops/firmware` as engineering/superadmin. Upload version, strictly increasing secure version, profile and binary. The API privately stores immutable bytes, SHA-256, signed canonical manifest and key fingerprint. It checks size/header, not electrical fitness or complete image qualification.
3. Provision the matching public key into qualified devices. Qualification must establish compatible OTA slots, available capacity, board/profile checks, power-loss behavior, a rollback-capable bootloader and local boot-health checks. Record evidence before an operator sets `devices.ota_qualified=true`; the default is false. That flag records qualification, it does not create it. Secure boot/flash encryption/anti-rollback eFuses are separate manufacturing procedures.
4. Enable OTA dispatch and select explicit devices, with the first as canary. The current cohort scheduler limits infrastructure gateways to one per rollout. Device poll returns a signed expiring offer. The device validates origin, request binding, profile, board, secure version and pinned RSA manifest signature; download is separately signed/authenticated.
5. The agent streams into the inactive OTA slot and hashes all bytes. It aborts a mismatched image. Durable pending-reboot intent and a committed staged receipt precede partition activation. Missing qualification refuses the update. Signed receipts preserve staged versus healthy new boot; a successful download cannot mark the device current.
6. A healthy new image verifies the running partition bytes and local storage/transport boot checks before marking the app valid and reporting its new boot. A rollback reports `rolled_back`. The backend updates version only after exact image/secure-version/new-boot/health confirmation. Failure/rollback pauses dispatch.
7. Review the canary physically and operationally, then explicitly advance 5%, 25%, remaining. Pause/cancel prevents new offers/downloads; it cannot recall bytes already staged on an offline device. Receipts still commit while paused so recovery is visible.

The present agent's health checks cover the commissioning transport/storage, not future production sensing/actuation. A production image needs its qualified metrology/safety health checks. Native tests and six ESP32 builds are software evidence; power-cut-mid-OTA, partition rollback and real device health remain physical acceptance gates.

## Software checks

`bash tools/verify.sh` covers policy, crypto, bounded link frames/reassembly and latching-driver state logic. After the PlatformIO `house_full` build installs pinned ArduinoJson, run `python tools/test_firmware_wire.py` to compile the actual firmware JSON/HMAC/RSA implementation against independent Python-generated vectors. API integration covers canary gating, download scoping, pause/resume, staged versus new boot, failure pause and downgrade rejection. Browser integration uploads the actual built ESP32 binary; it must remain pending when no device is connected.
