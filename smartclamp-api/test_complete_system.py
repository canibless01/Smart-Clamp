import sys
import os
import unittest
import hmac
import hashlib

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, DB
from feature_flags import set_flag

class TestCompleteSystem(unittest.TestCase):
    def setUp(self):
        DB["users"].clear()
        DB["buildings"].clear()
        DB["rooms"].clear()
        DB["devices"].clear()
        DB["wallets"].clear()
        DB["linked_meters"].clear()
        DB["usage_events"].clear()
        DB["command_tokens"].clear()
        DB["schedules"].clear()
        DB["budgets"].clear()
        DB["consents"].clear()

        self.app = create_app()
        self.client = self.app.test_client()

    def test_device_telemetry_hmac_verification(self):
        device_id = "device-hmac-test-1"
        key = "secret_device_key_123"
        DB["devices"][device_id] = {"id": device_id, "hmac_key": key}

        payload = b'{"voltage": 230.5, "current_amps": 4.2, "power_watts": 968.1, "energy_kwh": 12.4}'
        sig = hmac.new(key.encode("utf-8"), payload, hashlib.sha256).hexdigest()

        # Valid HMAC signature
        res = self.client.post(
            f"/api/v1/devices/{device_id}/readings",
            data=payload,
            content_type="application/json",
            headers={"X-Device-Signature": sig}
        )
        self.assertEqual(res.status_code, 200)

        # Invalid HMAC signature
        res_bad = self.client.post(
            f"/api/v1/devices/{device_id}/readings",
            data=payload,
            content_type="application/json",
            headers={"X-Device-Signature": "invalid_sig_123"}
        )
        self.assertEqual(res_bad.status_code, 401)

    def test_relay_toggle_and_step_up_otp(self):
        set_flag("pro_relay_control", enabled_for_tiers=["pro"])
        device_id = "device-relay-1"

        # Toggle relay -> returns step-up token ID
        res = self.client.post(
            f"/api/v1/devices/{device_id}/relay",
            json={"state": "off"},
            headers={"X-Test-Tier": "pro"}
        )
        self.assertEqual(res.status_code, 200)
        cmd_id = res.get_json()["command_token_id"]

        # Confirm step-up with valid OTP
        res_confirm = self.client.post(
            f"/api/v1/commands/{cmd_id}/confirm",
            json={"otp_code": "123456"}
        )
        self.assertEqual(res_confirm.status_code, 200)
        self.assertEqual(res_confirm.get_json()["status"], "command_confirmed_and_dispatched")

    def test_schedule_crud_operations(self):
        device_id = "device-sched-1"
        # Create schedule
        res_create = self.client.post(
            f"/api/v1/devices/{device_id}/schedules",
            json={"days_of_week": [0, 1, 2, 3, 4], "on_time": "07:00", "off_time": "23:00"}
        )
        self.assertEqual(res_create.status_code, 200)
        sched_id = res_create.get_json()["schedule_id"]

        # Get schedules
        res_get = self.client.get(f"/api/v1/devices/{device_id}/schedules")
        self.assertEqual(res_get.status_code, 200)
        self.assertEqual(len(res_get.get_json()["schedules"]), 1)

        # Delete schedule
        res_del = self.client.delete(f"/api/v1/schedules/{sched_id}")
        self.assertEqual(res_del.status_code, 200)

    def test_nepa_consent_and_command_enforcement(self):
        # Command blocked without consent
        res_blocked = self.client.post(
            "/api/v1/nepa/commands",
            json={"device_id": "dev-1", "command": "relay_off"},
            headers={"X-Test-Role": "nepa_staff", "X-Test-User-Id": "user-no-consent"}
        )
        self.assertEqual(res_blocked.status_code, 403)

        # Grant consent
        res_grant = self.client.post(
            "/api/v1/consents/utility-control",
            headers={"X-Test-User-Id": "user-no-consent"}
        )
        self.assertEqual(res_grant.status_code, 200)

        # Command succeeds after consent
        res_ok = self.client.post(
            "/api/v1/nepa/commands",
            json={"device_id": "dev-1", "command": "relay_off"},
            headers={"X-Test-Role": "nepa_staff", "X-Test-User-Id": "user-no-consent"}
        )
        self.assertEqual(res_ok.status_code, 200)

if __name__ == "__main__":
    unittest.main()
