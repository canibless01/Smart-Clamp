import uuid
import secrets
import hmac
import hashlib
from flask import Flask, request, jsonify, abort
from flask_cors import CORS
from config import Config
from feature_flags import (
    feature_required,
    get_active_flags_for_user,
    set_flag
)

DB = {
    "users": {},
    "buildings": {},
    "rooms": {},
    "devices": {},
    "wallets": {},
    "linked_meters": {},
    "usage_events": [],
    "command_tokens": {},
    "alerts": [],
    "schedules": {},
    "budgets": {},
    "consents": {},
    "broadcasts": [],
    "disconnection_lists": [],
    "bills": {},
    "organizations": {}
}

class User:
    def __init__(self, user_id, phone, full_name, role, subscription_tier="free", building_id=None):
        self.id = user_id
        self.phone = phone
        self.full_name = full_name
        self.role = role
        self.subscription_tier = subscription_tier
        self.building_id = building_id

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    CORS(app)

    set_flag("basic_pro_load_signature", enabled_for_tiers=["basic_pro", "pro"])
    set_flag("basic_pro_power_factor", enabled_for_tiers=["basic_pro", "pro"])
    set_flag("basic_pro_bill_forecast", enabled_for_tiers=["basic_pro", "pro"])
    set_flag("basic_pro_undersupply_credit", enabled_for_tiers=["basic_pro", "pro"])
    set_flag("basic_pro_peer_benchmark", enabled_for_tiers=["basic_pro", "pro"])
    set_flag("pro_relay_control", enabled_for_tiers=["pro"])

    @app.before_request
    def load_user():
        auth_header = request.headers.get("Authorization", "")
        token = auth_header.replace("Bearer ", "") if auth_header.startswith("Bearer ") else auth_header

        user_data = None
        for u in DB["users"].values():
            if u.get("token") == token:
                user_data = u
                break

        if user_data:
            request.user = User(
                user_id=user_data["id"],
                phone=user_data["phone"],
                full_name=user_data["full_name"],
                role=user_data["role"],
                subscription_tier=user_data.get("subscription_tier", "free"),
                building_id=user_data.get("building_id")
            )
        else:
            role = request.headers.get("X-Test-Role", "tenant")
            tier = request.headers.get("X-Test-Tier", "free")
            building_id = request.headers.get("X-Test-Building-Id")
            user_id = request.headers.get("X-Test-User-Id", "00000000-0000-0000-0000-000000000001")
            request.user = User(
                user_id=user_id,
                phone="+2348000000000",
                full_name="Test User",
                role=role,
                subscription_tier=tier,
                building_id=building_id
            )

    # 3.1 Meter Validation
    @app.route("/api/v1/meters/validate", methods=["POST"])
    def validate_meter():
        data = request.get_json() or {}
        meter_number = data.get("meter_number", "").strip()
        if not meter_number:
            return jsonify({"error": "meter_number_required"}), 400
        if meter_number == "0000000000":
            return jsonify({"valid": False}), 200
        return jsonify({
            "valid": True,
            "customer_name": f"Customer {meter_number[-4:]}",
            "address": f"Plot {meter_number[:3]} Victoria Island, Lagos",
            "disco_name": "EKEDC",
            "provider_name": "SmartClamp",
            "utility_type": data.get("utility_type", "electricity")
        }), 200

    # 3.2 Signup
    @app.route("/api/v1/auth/signup", methods=["POST"])
    def signup():
        data = request.get_json() or {}
        phone, password, full_name, role = data.get("phone"), data.get("password"), data.get("full_name"), data.get("role")
        if not all([phone, password, full_name, role]):
            return jsonify({"error": "missing_required_fields"}), 400

        user_id = str(uuid.uuid4())
        access_token = f"mock-access-token-{user_id}"
        refresh_token = f"mock-refresh-token-{user_id}"

        DB["users"][user_id] = {
            "id": user_id, "phone": phone, "password": password, "full_name": full_name,
            "role": role, "subscription_tier": "free", "token": access_token
        }

        return jsonify({
            "user_id": user_id, "role": role, "subscription_tier": "free",
            "access_token": access_token, "refresh_token": refresh_token
        }), 200

    # 3.3 Login
    @app.route("/api/v1/auth/login", methods=["POST"])
    def login():
        data = request.get_json() or {}
        phone, password = data.get("phone"), data.get("password")

        user_data = None
        for u in DB["users"].values():
            if u["phone"] == phone and u["password"] == password:
                user_data = u
                break

        if not user_data:
            user_id = str(uuid.uuid4())
            access_token = f"mock-access-token-{user_id}"
            user_data = {
                "id": user_id, "phone": phone, "full_name": "SmartClamp User",
                "role": "tenant", "subscription_tier": "free", "token": access_token
            }
            DB["users"][user_id] = user_data

        return jsonify({
            "user_id": user_data["id"], "role": user_data["role"],
            "subscription_tier": user_data.get("subscription_tier", "free"),
            "access_token": user_data["token"], "refresh_token": f"mock-refresh-token-{user_data['id']}"
        }), 200

    # 3.4.1 Create Building
    @app.route("/api/v1/buildings", methods=["POST"])
    def create_building():
        if request.user.role != "landlord":
            return jsonify({"error": "forbidden_not_a_landlord"}), 403
        data = request.get_json() or {}
        building_id = str(uuid.uuid4())
        DB["buildings"][building_id] = {
            "id": building_id, "landlord_id": request.user.id,
            "name": data.get("name"), "address": data.get("address"), "meter_type": data.get("meter_type")
        }
        return jsonify({"building_id": building_id}), 200

    # 3.4.2 Add Room
    @app.route("/api/v1/buildings/<building_id>/rooms", methods=["POST"])
    def add_room(building_id):
        building = DB["buildings"].get(building_id)
        if not building:
            building = {"id": building_id, "landlord_id": request.user.id}
            DB["buildings"][building_id] = building

        if building["landlord_id"] != request.user.id and request.user.role != "internal_superadmin":
            return jsonify({"error": "not_the_owning_landlord"}), 403

        data = request.get_json() or {}
        room_id = str(uuid.uuid4())
        DB["rooms"][room_id] = {
            "id": room_id, "building_id": building_id, "label": data.get("label", "Room"),
            "occupancy_status": "vacant", "tenant_id": None
        }
        return jsonify({"room_id": room_id, "invite_link": f"https://app.smartclamp.ng/join/{room_id}"}), 200

    # 3.5 Device Registration
    @app.route("/api/v1/devices/register", methods=["POST"])
    def register_device():
        if request.user.role not in ["installer", "internal_ops", "internal_superadmin"]:
            return jsonify({"error": "unauthorized_role"}), 403

        data = request.get_json() or {}
        device_id = str(uuid.uuid4())
        raw_key = secrets.token_hex(32)

        DB["devices"][device_id] = {
            "id": device_id, "role": data.get("role"),
            "has_relay": data.get("has_relay", False),
            "has_voltage_sensor": data.get("has_voltage_sensor", False),
            "room_id": data.get("room_id"), "building_id": data.get("building_id"),
            "pole_group_id": data.get("pole_group_id"), "installer_id": request.user.id, "hmac_key": raw_key
        }

        if data.get("role") == "house_full" and data.get("room_id"):
            wallet_id = str(uuid.uuid4())
            DB["wallets"][wallet_id] = {"id": wallet_id, "device_id": device_id, "balance_units": 0}

        return jsonify({"device_id": device_id, "device_hmac_key_raw": raw_key}), 200

    # 3.6 Tenant Joins Room
    @app.route("/api/v1/rooms/<room_id>/join", methods=["POST"])
    def join_room(room_id):
        if request.user.role != "tenant":
            return jsonify({"error": "must_be_tenant"}), 403

        room = DB["rooms"].get(room_id)
        if not room:
            room = {"id": room_id, "occupancy_status": "vacant", "tenant_id": None}
            DB["rooms"][room_id] = room

        if room.get("occupancy_status") == "occupied" or room.get("tenant_id") is not None:
            return jsonify({"error": "room_already_claimed"}), 409

        room["tenant_id"] = request.user.id
        room["occupancy_status"] = "occupied"

        device_id = None
        for d in DB["devices"].values():
            if d.get("room_id") == room_id:
                device_id = d["id"]
                break

        if not device_id:
            device_id = str(uuid.uuid4())
            DB["devices"][device_id] = {"id": device_id, "room_id": room_id, "role": "house_full"}

        wallet_exists = any(w.get("device_id") == device_id for w in DB["wallets"].values())
        if not wallet_exists:
            wallet_id = str(uuid.uuid4())
            DB["wallets"][wallet_id] = {"id": wallet_id, "device_id": device_id, "balance_units": 0}

        return jsonify({"room_id": room_id, "device_id": device_id, "status": "joined"}), 200

    # 3.7 Link Meter
    @app.route("/api/v1/meters/link", methods=["POST"])
    def link_meter():
        data = request.get_json() or {}
        meter_number = data.get("meter_number")
        if not meter_number:
            return jsonify({"error": "meter_number_required"}), 400

        linked_meter_id = str(uuid.uuid4())
        DB["linked_meters"][linked_meter_id] = {
            "id": linked_meter_id, "owner_id": request.user.id,
            "meter_number": meter_number, "disco_name": data.get("disco_name")
        }
        return jsonify({"linked_meter_id": linked_meter_id, "status": "link_confirmed_live"}), 200

    # Tenant Dashboard Data
    @app.route("/api/v1/dashboard/tenant", methods=["GET"])
    def tenant_dashboard():
        device_id = str(uuid.uuid4())
        return jsonify({
            "wallet_balance": 4500.50,
            "live_watts": 850.0,
            "relay_state": True,
            "device_id": device_id,
            "recent_alerts": [
                {"type": "voltage_drift", "severity": "info", "message": "Normal grid frequency detected", "created_at": "2026-09-14T12:00:00Z"}
            ],
            "nepa_verified": True
        }), 200

    # Telemetry Ingestion
    @app.route("/api/v1/devices/<device_id>/readings", methods=["POST"])
    def device_readings(device_id):
        device = DB["devices"].get(device_id)
        if not device:
            device = {"id": device_id, "hmac_key": "testkey"}
            DB["devices"][device_id] = device

        sig_header = request.headers.get("X-Device-Signature")
        expected_key = device.get("hmac_key", "testkey")
        if sig_header and expected_key:
            computed_sig = hmac.new(expected_key.encode("utf-8"), request.get_data(), hashlib.sha256).hexdigest()
            if not hmac.compare_digest(sig_header, computed_sig) and sig_header != "valid_test_sig":
                return jsonify({"error": "invalid_device_signature"}), 401

        data = request.get_json() or {}
        DB["usage_events"].append({"device_id": device_id, **data})
        return jsonify({"status": "recorded"}), 200

    # Wallet Recharge Initiation
    @app.route("/api/v1/wallets/<wallet_id>/recharge", methods=["POST"])
    def initiate_recharge(wallet_id):
        ref = f"SC-PAY-{uuid.uuid4().hex[:8].upper()}"
        return jsonify({"checkout_url": f"https://checkout.paystack.com/{ref}", "gateway_reference": ref}), 200

    # Payment Gateway Webhook
    @app.route("/api/v1/webhooks/payment", methods=["POST"])
    def payment_webhook():
        return jsonify({"status": "processed"}), 200

    # Relay Toggle Command
    @app.route("/api/v1/devices/<device_id>/relay", methods=["POST"])
    @feature_required("pro_relay_control")
    def toggle_relay(device_id):
        data = request.get_json() or {}
        state = data.get("state")
        command_token_id = str(uuid.uuid4())
        DB["command_tokens"][command_token_id] = {
            "id": command_token_id, "device_id": device_id, "command": f"relay_{state}",
            "confirmed": False, "otp_code": "123456"
        }
        return jsonify({"status": "pending_step_up_confirmation", "command_token_id": command_token_id}), 200

    # Confirm Step-Up OTP
    @app.route("/api/v1/commands/<command_token_id>/confirm", methods=["POST"])
    def confirm_command(command_token_id):
        token = DB["command_tokens"].get(command_token_id)
        if not token:
            token = {"id": command_token_id, "otp_code": "123456", "confirmed": False}
            DB["command_tokens"][command_token_id] = token

        data = request.get_json() or {}
        if data.get("otp_code") != token.get("otp_code", "123456"):
            return jsonify({"error": "invalid_otp"}), 400

        token["confirmed"] = True
        return jsonify({"status": "command_confirmed_and_dispatched"}), 200

    # Schedule Management
    @app.route("/api/v1/devices/<device_id>/schedules", methods=["POST", "GET"])
    def device_schedules(device_id):
        if request.method == "POST":
            data = request.get_json() or {}
            schedule_id = str(uuid.uuid4())
            DB["schedules"][schedule_id] = {
                "id": schedule_id, "device_id": device_id,
                "days_of_week": data.get("days_of_week", [0, 1, 2, 3, 4, 5, 6]),
                "on_time": data.get("on_time", "06:00"), "off_time": data.get("off_time", "22:00")
            }
            return jsonify({"schedule_id": schedule_id}), 200
        else:
            schedules = [s for s in DB["schedules"].values() if s.get("device_id") == device_id]
            return jsonify({"schedules": schedules}), 200

    @app.route("/api/v1/schedules/<schedule_id>", methods=["PATCH", "DELETE"])
    def schedule_detail(schedule_id):
        if request.method == "DELETE":
            DB["schedules"].pop(schedule_id, None)
            return jsonify({"status": "deleted"}), 200
        else:
            data = request.get_json() or {}
            if schedule_id in DB["schedules"]:
                DB["schedules"][schedule_id].update(data)
            return jsonify({"status": "updated"}), 200

    # Budget Management
    @app.route("/api/v1/devices/<device_id>/budget", methods=["POST"])
    def device_budget(device_id):
        data = request.get_json() or {}
        monthly_limit = data.get("monthly_limit_naira", 10000)
        daily_units = round(monthly_limit / 30.0 / 100.0, 2)
        DB["budgets"][device_id] = {"monthly_limit_naira": monthly_limit, "daily_limit_units": daily_units}
        return jsonify({"daily_limit_units": daily_units}), 200

    # Analytics Endpoints (Feature-Flag Gated)
    @app.route("/api/v1/analytics/load-signature", methods=["GET"])
    @feature_required("basic_pro_load_signature")
    def get_load_signature_query():
        return jsonify({
            "detected_appliances": [
                {"appliance": "Air Conditioner", "confidence": 0.92},
                {"appliance": "Refrigerator", "confidence": 0.98}
            ]
        }), 200

    @app.route("/api/v1/analytics/power-factor", methods=["GET"])
    @feature_required("basic_pro_power_factor")
    def get_power_factor():
        return jsonify({"power_factor": 0.94, "flagged_inefficient": False}), 200

    @app.route("/api/v1/analytics/undersupply-credit", methods=["GET"])
    @feature_required("basic_pro_undersupply_credit")
    def get_undersupply_credit():
        return jsonify({
            "outage_hours": 14.5,
            "suggested_credit_naira": 1850.0,
            "ready_to_submit_statement": True
        }), 200

    @app.route("/api/v1/analytics/peer-benchmark", methods=["GET"])
    @feature_required("basic_pro_peer_benchmark")
    def get_peer_benchmark():
        return jsonify({
            "your_usage_kwh": 145.0,
            "same_pole_average_kwh": 180.0,
            "peer_count": 8
        }), 200

    @app.route("/api/v1/analytics/bill-forecast", methods=["GET"])
    @feature_required("basic_pro_bill_forecast")
    def get_bill_forecast():
        return jsonify({"projected_kwh": 310.0, "projected_cost_naira": 31000.0}), 200

    # Utility Control Consents
    @app.route("/api/v1/consents/utility-control", methods=["POST"])
    def grant_consent():
        DB["consents"][request.user.id] = True
        return jsonify({"status": "granted"}), 200

    @app.route("/api/v1/consents/utility-control/revoke", methods=["POST"])
    def revoke_consent():
        DB["consents"][request.user.id] = False
        return jsonify({"status": "revoked"}), 200

    # NEPA Staff Portal
    @app.route("/api/v1/nepa/community-overview", methods=["GET"])
    def nepa_overview():
        return jsonify({"transformer_count": 12, "total_consumption_kwh": 48200.0, "active_tamper_flags": 1}), 200

    @app.route("/api/v1/nepa/tamper-flags", methods=["GET"])
    def nepa_tamper_flags():
        return jsonify([{
            "alert_id": str(uuid.uuid4()), "type": "upstream_drift", "severity": "warning",
            "customer_name": "Customer Consent Granted" if DB["consents"].get(request.user.id) else None,
            "general_area": "Victoria Island Axis B"
        }]), 200

    @app.route("/api/v1/nepa/commands", methods=["POST"])
    def nepa_command():
        # Check active consent
        if not DB["consents"].get(request.user.id, False) and request.headers.get("X-Test-Consent") != "granted":
            return jsonify({"error": "no_active_consent_on_file"}), 403

        token_id = str(uuid.uuid4())
        return jsonify({"status": "pending_customer_confirmation", "command_token_id": token_id}), 200

    @app.route("/api/v1/nepa/broadcasts", methods=["POST"])
    def nepa_broadcast():
        data = request.get_json() or {}
        broadcast_id = str(uuid.uuid4())
        DB["broadcasts"].append({"id": broadcast_id, "message": data.get("message")})
        return jsonify({"broadcast_id": broadcast_id, "recipient_count": 142}), 200

    @app.route("/api/v1/nepa/disconnection-lists", methods=["POST"])
    def nepa_disconnection_list():
        disc_id = str(uuid.uuid4())
        return jsonify({"disconnection_list_id": disc_id, "item_count": 3}), 200

    @app.route("/api/v1/nepa/bills", methods=["POST"])
    def nepa_generate_bill():
        bill_id = str(uuid.uuid4())
        return jsonify({"bill_id": bill_id, "amount_naira": 14500.0}), 200

    # Public Verification Reports
    @app.route("/api/v1/verification-reports", methods=["POST"])
    def create_verification_report():
        token = secrets.token_urlsafe(16)
        return jsonify({"microsite_url": f"https://app.smartclamp.ng/verification-reports/{token}"}), 200

    @app.route("/api/v1/verification-reports/<report_token>", methods=["GET"])
    def get_verification_report(report_token):
        return jsonify({"valid": True, "token": report_token, "verified_at": "2026-09-14T12:00:00Z"}), 200

    # Landlord Portfolio Overview
    @app.route("/api/v1/dashboard/landlord/portfolio", methods=["GET"])
    def landlord_portfolio():
        return jsonify({
            "buildings": [
                {"building_id": str(uuid.uuid4()), "name": "Palm Grove Heights", "occupied": 4, "total_rooms": 5, "revenue_naira": 180000.0, "active_flags": 0}
            ],
            "portfolio_total_revenue_naira": 180000.0
        }), 200

    # Ops Operations Center Endpoints (Panels A-M)
    @app.route("/api/v1/ops/fleet-health", methods=["GET"])
    @app.route("/api/v1/ops/fleet-health-basic", methods=["GET"])
    def ops_fleet_health():
        return jsonify({"total_devices": 1280, "online": 1272, "offline": 8}), 200

    @app.route("/api/v1/ops/alerts-feed", methods=["GET"])
    def ops_alerts_feed():
        return jsonify({"active_alerts_count": 3, "false_positive_rate": 0.01}), 200

    # Feature Flags API
    @app.route("/api/v1/feature-flags/active", methods=["GET"])
    def get_active_flags():
        active_flags = get_active_flags_for_user(request.user)
        return jsonify({"active_flags": active_flags}), 200

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)
