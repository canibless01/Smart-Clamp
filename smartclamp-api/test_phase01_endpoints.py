import sys
import os
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, DB

class TestPhase01Endpoints(unittest.TestCase):
    def setUp(self):
        DB["users"].clear()
        DB["buildings"].clear()
        DB["rooms"].clear()
        DB["devices"].clear()
        DB["wallets"].clear()
        DB["linked_meters"].clear()

        self.app = create_app()
        self.client = self.app.test_client()

    def test_meter_validation_success_and_failure(self):
        # Success case
        res = self.client.post("/api/v1/meters/validate", json={"meter_number": "1234567890"})
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["valid"])
        self.assertEqual(data["disco_name"], "EKEDC")

        # Not found case
        res_fail = self.client.post("/api/v1/meters/validate", json={"meter_number": "0000000000"})
        self.assertEqual(res_fail.status_code, 200)
        self.assertFalse(res_fail.get_json()["valid"])

    def test_signup_and_login_flow(self):
        # Signup
        signup_res = self.client.post("/api/v1/auth/signup", json={
            "phone": "+2348011112222",
            "password": "secretpassword123",
            "full_name": "Nneka Okafor",
            "role": "landlord"
        })
        self.assertEqual(signup_res.status_code, 200)
        signup_data = signup_res.get_json()
        self.assertEqual(signup_data["role"], "landlord")
        self.assertIn("access_token", signup_data)

        # Login
        login_res = self.client.post("/api/v1/auth/login", json={
            "phone": "+2348011112222",
            "password": "secretpassword123"
        })
        self.assertEqual(login_res.status_code, 200)
        login_data = login_res.get_json()
        self.assertEqual(login_data["role"], "landlord")

    def test_building_and_room_creation(self):
        # Landlord creates building
        b_res = self.client.post("/api/v1/buildings", json={
            "name": "Sunshine Estate",
            "address": "12 Marina, Lagos",
            "meter_type": "with_meter"
        }, headers={"X-Test-Role": "landlord", "X-Test-User-Id": "landlord-uuid-1"})
        self.assertEqual(b_res.status_code, 200)
        b_id = b_res.get_json()["building_id"]

        # Add room to building
        r_res = self.client.post(f"/api/v1/buildings/{b_id}/rooms", json={
            "label": "Flat 3B"
        }, headers={"X-Test-Role": "landlord", "X-Test-User-Id": "landlord-uuid-1"})
        self.assertEqual(r_res.status_code, 200)
        r_data = r_res.get_json()
        self.assertIn("invite_link", r_data)

    def test_device_registration_by_installer(self):
        res = self.client.post("/api/v1/devices/register", json={
            "role": "house_full",
            "has_relay": True,
            "has_voltage_sensor": True,
            "room_id": "room-uuid-1"
        }, headers={"X-Test-Role": "installer"})
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("device_id", data)
        self.assertIn("device_hmac_key_raw", data)

    def test_tenant_joins_room(self):
        # Room setup
        room_id = "test-room-uuid"
        DB["rooms"][room_id] = {"id": room_id, "occupancy_status": "vacant", "tenant_id": None}

        res = self.client.post(f"/api/v1/rooms/{room_id}/join", headers={"X-Test-Role": "tenant", "X-Test-User-Id": "tenant-uuid-1"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["status"], "joined")

        # Second join attempt fails with 409
        res_conflict = self.client.post(f"/api/v1/rooms/{room_id}/join", headers={"X-Test-Role": "tenant", "X-Test-User-Id": "tenant-uuid-2"})
        self.assertEqual(res_conflict.status_code, 409)

    def test_meter_linking(self):
        res = self.client.post("/api/v1/meters/link", json={
            "meter_number": "44001234567",
            "disco_name": "IKEDC"
        }, headers={"X-Test-Role": "tenant"})
        self.assertEqual(res.status_code, 200)
        self.assertIn("linked_meter_id", res.get_json())

if __name__ == "__main__":
    unittest.main()
