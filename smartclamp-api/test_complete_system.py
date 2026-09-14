import sys
import os
import unittest
import hmac
import hashlib

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, DB, detect_upstream_drift
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
        DB["audit_log"].clear()
        DB["alerts"].clear()

        self.app = create_app()
        self.client = self.app.test_client()

    def test_device_telemetry_hmac_verification(self):
        device_id = "device-hmac-test-1"
        key = "secret_device_key_123"
        DB["devices"][device_id] = {"id": device_id, "hmac_key": key}

        payload = b'{"voltage": 230.5, "current_amps": 4.2, "power_watts": 968.1, "energy_kwh": 12.4}'
        sig = hmac.new(key.encode("utf-8"), payload, hashlib.sha256).hexdigest()

        res = self.client.post(
            f"/api/v1/devices/{device_id}/readings",
            data=payload,
            content_type="application/json",
            headers={"X-Device-Signature": sig}
        )
        self.assertEqual(res.status_code, 200)

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

        res = self.client.post(
            f"/api/v1/devices/{device_id}/relay",
            json={"state": "off"},
            headers={"X-Test-Tier": "pro"}
        )
        self.assertEqual(res.status_code, 200)
        cmd_id = res.get_json()["command_token_id"]

        res_confirm = self.client.post(
            f"/api/v1/commands/{cmd_id}/confirm",
            json={"otp_code": "123456"}
        )
        self.assertEqual(res_confirm.status_code, 200)
        self.assertEqual(res_confirm.get_json()["status"], "command_confirmed_and_dispatched")

    def test_schedule_crud_operations(self):
        device_id = "device-sched-1"
        res_create = self.client.post(
            f"/api/v1/devices/{device_id}/schedules",
            json={"days_of_week": [0, 1, 2, 3, 4], "on_time": "07:00", "off_time": "23:00"}
        )
        self.assertEqual(res_create.status_code, 200)
        sched_id = res_create.get_json()["schedule_id"]

        res_get = self.client.get(f"/api/v1/devices/{device_id}/schedules")
        self.assertEqual(res_get.status_code, 200)
        self.assertEqual(len(res_get.get_json()["schedules"]), 1)

        res_del = self.client.delete(f"/api/v1/schedules/{sched_id}")
        self.assertEqual(res_del.status_code, 200)

    def test_nepa_consent_and_command_enforcement(self):
        res_blocked = self.client.post(
            "/api/v1/nepa/commands",
            json={"device_id": "dev-1", "command": "relay_off"},
            headers={"X-Test-Role": "nepa_staff", "X-Test-User-Id": "user-no-consent"}
        )
        self.assertEqual(res_blocked.status_code, 403)

        res_grant = self.client.post(
            "/api/v1/consents/utility-control",
            headers={"X-Test-User-Id": "user-no-consent"}
        )
        self.assertEqual(res_grant.status_code, 200)

        res_ok = self.client.post(
            "/api/v1/nepa/commands",
            json={"device_id": "dev-1", "command": "relay_off"},
            headers={"X-Test-Role": "nepa_staff", "X-Test-User-Id": "user-no-consent"}
        )
        self.assertEqual(res_ok.status_code, 200)

    def test_meeting_view_data_minimization(self):
        res = self.client.get("/api/v1/disputes/disp-999/meeting-view")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("usage_graph_data", data)
        self.assertIn("bill_breakdown", data)
        # Verify no extraneous account keys leak
        self.assertNotIn("payment_history", data)
        self.assertNotIn("user_credentials", data)

    def test_verification_report_public_microsite(self):
        res_gen = self.client.post("/api/v1/verification-reports", json={"device_id": "dev-1"})
        self.assertEqual(res_gen.status_code, 200)
        url = res_gen.get_json()["microsite_url"]
        report_token = url.split("/")[-1]

        # Public lookup without auth
        res_pub = self.client.get(f"/api/v1/verification-reports/{report_token}")
        self.assertEqual(res_pub.status_code, 200)
        data = res_pub.get_json()
        self.assertTrue(data["valid"])
        self.assertTrue(data["signature_verified_live"])

    def test_internal_ops_role_and_access_audit(self):
        # Non-internal role is blocked
        res_denied = self.client.get("/api/v1/ops/fleet-health", headers={"X-Test-Role": "tenant"})
        self.assertEqual(res_denied.status_code, 403)

        # Internal ops role is allowed and logs audit entry
        res_ok = self.client.get("/api/v1/ops/fleet-health", headers={"X-Test-Role": "internal_ops"})
        self.assertEqual(res_ok.status_code, 200)

        # Confirm audit entry in Panel K log
        res_audit = self.client.get("/api/v1/ops/access-audit", headers={"X-Test-Role": "internal_ops"})
        self.assertEqual(res_audit.status_code, 200)
        audit_entries = res_audit.get_json()
        self.assertTrue(len(audit_entries) >= 1)

    def test_detect_upstream_drift_rule(self):
        pole_id = "pole-dev-1"
        DB["devices"][pole_id] = {"id": pole_id, "role": "pole_device"}

        # Simulate 3 consecutive 15% drift readings
        DB["usage_events"].append({"device_id": pole_id, "power_watts": 1000.0, "parent_pole_id": None})
        DB["usage_events"].append({"device_id": "sub-1", "power_watts": 800.0, "parent_pole_id": pole_id})

        detect_upstream_drift(pole_id)
        detect_upstream_drift(pole_id)
        detect_upstream_drift(pole_id)

        # Critical alert should be created
        critical_alerts = [a for a in DB["alerts"] if a.get("type") == "upstream_drift"]
        self.assertTrue(len(critical_alerts) >= 1)

if __name__ == "__main__":
    unittest.main()
