import sys
import os
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from feature_flags import set_flag, is_feature_enabled, _FEATURE_FLAGS_STORE

class MockUser:
    def __init__(self, subscription_tier="free", building_id=None):
        self.subscription_tier = subscription_tier
        self.building_id = building_id

class TestFeatureFlags(unittest.TestCase):
    def setUp(self):
        _FEATURE_FLAGS_STORE.clear()
        self.app = create_app()
        self.client = self.app.test_client()

    def test_global_feature_flag(self):
        set_flag("global_feature", enabled_globally=True)
        user = MockUser(subscription_tier="free")
        self.assertTrue(is_feature_enabled("global_feature", user))

    def test_tier_feature_flag(self):
        set_flag("pro_feature", enabled_for_tiers=["pro"])
        free_user = MockUser(subscription_tier="free")
        pro_user = MockUser(subscription_tier="pro")

        self.assertFalse(is_feature_enabled("pro_feature", free_user))
        self.assertTrue(is_feature_enabled("pro_feature", pro_user))

    def test_building_pilot_feature_flag(self):
        b_id = "building-123"
        set_flag("pilot_feature", enabled_for_building_ids=[b_id])
        user_in_building = MockUser(building_id=b_id)
        user_other_building = MockUser(building_id="building-999")

        self.assertTrue(is_feature_enabled("pilot_feature", user_in_building))
        self.assertFalse(is_feature_enabled("pilot_feature", user_other_building))

    def test_active_feature_flags_endpoint(self):
        set_flag("basic_pro_load_signature", enabled_for_tiers=["basic_pro"])
        response = self.client.get("/api/v1/feature-flags/active", headers={"X-Test-Tier": "basic_pro"})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("active_flags", data)
        self.assertIn("basic_pro_load_signature", data["active_flags"])

    def test_feature_required_decorator_403_when_disabled(self):
        set_flag("basic_pro_load_signature", enabled_for_tiers=["basic_pro"])
        # Free tier request to gated endpoint
        response = self.client.get(
            "/api/v1/analytics/load-signature",
            headers={"X-Test-Tier": "free"}
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.get_json(), {"error": "feature_not_available"})

    def test_feature_required_decorator_200_when_enabled(self):
        set_flag("basic_pro_load_signature", enabled_for_tiers=["basic_pro"])
        # Basic Pro tier request to gated endpoint
        response = self.client.get(
            "/api/v1/analytics/load-signature",
            headers={"X-Test-Tier": "basic_pro"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("detected_appliances", response.get_json())

if __name__ == "__main__":
    unittest.main()
