from flask import Flask, request, jsonify
from flask_cors import CORS
from config import Config
from feature_flags import (
    feature_required,
    get_active_flags_for_user,
    set_flag
)

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    CORS(app)

    # Initialize default feature flags
    set_flag("basic_pro_load_signature", enabled_for_tiers=["basic_pro", "pro"])
    set_flag("basic_pro_power_factor", enabled_for_tiers=["basic_pro", "pro"])
    set_flag("basic_pro_bill_forecast", enabled_for_tiers=["basic_pro", "pro"])
    set_flag("pro_relay_control", enabled_for_tiers=["pro"])

    @app.before_request
    def load_user():
        # Simulated auth middleware setting request.user
        # In production this parses Supabase JWT
        class User:
            def __init__(self, user_id=None, role="tenant", subscription_tier="free", building_id=None):
                self.id = user_id or "00000000-0000-0000-0000-000000000001"
                self.role = role
                self.subscription_tier = subscription_tier
                self.building_id = building_id

        auth_header = request.headers.get("Authorization")
        tier = request.headers.get("X-Test-Tier", "free")
        building_id = request.headers.get("X-Test-Building-Id")
        request.user = User(subscription_tier=tier, building_id=building_id)

    @app.route("/api/v1/feature-flags/active", methods=["GET"])
    def get_active_flags():
        active_flags = get_active_flags_for_user(request.user)
        return jsonify({"active_flags": active_flags}), 200

    @app.route("/api/v1/analytics/load-signature/<device_id>", methods=["GET"])
    @feature_required("basic_pro_load_signature")
    def get_load_signature(device_id):
        return jsonify({
            "detected_appliances": [
                {"appliance": "Refrigerator", "confidence": 0.95}
            ]
        }), 200

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)
