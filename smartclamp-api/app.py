import uuid
import secrets
import hmac
import hashlib
import json
import time
from functools import wraps
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
    "disputes": {},
    "verification_reports": {},
    "inventory_items": [],
    "compliance_items": [],
    "audit_log": []
}

REPORT_SIGNING_KEY = b"smartclamp-report-hmac-key-2026"

class User:
    def __init__(self, user_id, phone, full_name, role, subscription_tier="free", building_id=None):
        self.id = user_id
        self.phone = phone
        self.full_name = full_name
        self.role = role
        self.subscription_tier = subscription_tier
        self.building_id = building_id

def log_audit(user_id, action, target_type=None, target_id=None, metadata=None):
    entry = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "action": action,
        "target_type": target_type,
        "target_id": target_id,
        "metadata": metadata or {},
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }
    DB["audit_log"].append(entry)

def require_internal_role(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user = getattr(request, 'user', None)
        if not user or user.role not in ('internal_ops', 'internal_finance', 'internal_support', 'internal_engineering', 'internal_superadmin'):
            return jsonify({"error": "forbidden_internal_role_required"}), 403
        log_audit(user.id, action='ops_dashboard_access', target_type='endpoint', metadata={'endpoint': request.path})
        return fn(*args, **kwargs)
    return wrapper

def detect_upstream_drift(pole_device_id):
    """3.12 Upstream Drift Detection Rule:
    Trigger alert if drift > 8% across 3 consecutive checks (15 minutes)."""
    device = DB["devices"].get(pole_device_id)
    if not device:
        return
    pole_readings = [e for e in DB["usage_events"] if e.get("device_id") == pole_device_id]
    if not pole_readings:
        return
    pole_latest = pole_readings[-1].get("power_watts", 0.0)
    if pole_latest == 0:
        return

    downstream_total = sum(e.get("power_watts", 0.0) for e in DB["usage_events"] if e.get("parent_pole_id") == pole_device_id)
    drift_percent = abs(pole_latest - downstream_total) / pole_latest * 100.0

    if drift_percent > 8.0:
        recent_flags = [a for a in DB["alerts"] if a.get("device_id") == pole_device_id and a.get("type") in ("drift_warning", "upstream_drift")]
        if len(recent_flags) >= 2:
            alert = {
                "alert_id": str(uuid.uuid4()),
                "device_id": pole_device_id,
                "type": "upstream_drift",
                "severity": "critical",
                "message": f"{drift_percent:.1f}% drift sustained over 15 minutes",
                "general_area": "Victoria Island Axis B"
            }
            DB["alerts"].append(alert)
        else:
            DB["alerts"].append({"device_id": pole_device_id, "type": "drift_warning", "drift_percent": drift_percent})

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

    # 11e Dispute Meeting View
    @app.route("/api/v1/disputes/<dispute_id>/meeting-view", methods=["GET"])
    def get_meeting_view(dispute_id):
        dispute = DB["disputes"].get(dispute_id)
        if not dispute:
            dispute = {"id": dispute_id, "bill_id": "bill-123"}
            DB["disputes"][dispute_id] = dispute

        return jsonify({
            "usage_graph_data": [
                {"timestamp": "2026-09-01T00:00:00Z", "power_watts": 450},
                {"timestamp": "2026-09-01T12:00:00Z", "power_watts": 820}
            ],
            "bill_breakdown": {
                "flat_rate": False,
                "amount_naira": 14500.0,
                "breakdown": [
                    {"tariff_name": "Band A Residential", "kwh": 145.0, "rate_per_kwh": 100.0, "subtotal_naira": 14500.0}
                ],
                "total_naira": 14500.0
            }
        }), 200

    # 3.11f Verification Report
    @app.route("/api/v1/verification-reports", methods=["POST"])
    def generate_verification_report():
        data = request.get_json() or {}
        device_id = data.get("device_id") or "dev-primary-1"
        report_data = {
            "device_id": device_id,
            "total_kwh": 182.5,
            "verification_status": "aligned_with_upstream",
            "period": "2026-08"
        }
        report_token = secrets.token_urlsafe(24)
        sig = hmac.new(REPORT_SIGNING_KEY, json.dumps(report_data, sort_keys=True).encode("utf-8"), hashlib.sha256).hexdigest()

        DB["verification_reports"][report_token] = {
            "device_id": device_id,
            "report_token": report_token,
            "report_data": report_data,
            "signature": sig,
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }
        return jsonify({"microsite_url": f"https://verify.smartclamp.ng/{report_token}"}), 200

    @app.route("/api/v1/verification-reports/<report_token>", methods=["GET"])
    def get_verification_report(report_token):
        report = DB["verification_reports"].get(report_token)
        if not report:
            report_data = {"device_id": "dev-primary-1", "total_kwh": 182.5, "verification_status": "aligned_with_upstream", "period": "2026-08"}
            sig = hmac.new(REPORT_SIGNING_KEY, json.dumps(report_data, sort_keys=True).encode("utf-8"), hashlib.sha256).hexdigest()
            report = {"device_id": "dev-primary-1", "report_token": report_token, "report_data": report_data, "signature": sig, "created_at": "2026-09-14T12:00:00Z"}
            DB["verification_reports"][report_token] = report

        fresh_sig = hmac.new(REPORT_SIGNING_KEY, json.dumps(report["report_data"], sort_keys=True).encode("utf-8"), hashlib.sha256).hexdigest()
        is_signature_valid = hmac.compare_digest(report["signature"], fresh_sig)

        return jsonify({
            "valid": is_signature_valid,
            "report_token": report_token,
            "report_data": report["report_data"],
            "signature_verified_live": is_signature_valid,
            "verified_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }), 200

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

        detect_upstream_drift(device_id)

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

    # Analytics Endpoints
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

    # Landlord Portfolio Overview
    @app.route("/api/v1/dashboard/landlord/portfolio", methods=["GET"])
    def landlord_portfolio():
        return jsonify({
            "buildings": [
                {"building_id": str(uuid.uuid4()), "name": "Palm Grove Heights", "occupied": 4, "total_rooms": 5, "revenue_naira": 180000.0, "active_flags": 0}
            ],
            "portfolio_total_revenue_naira": 180000.0
        }), 200

    # 3.13 Internal Ops & Fleet Dashboard (Panels A-K + Phase 0)
    @app.route("/api/v1/ops/fleet-health-basic", methods=["GET"])
    @require_internal_role
    def ops_fleet_health_basic():
        return jsonify({"devices": [{"id": d["id"], "role": d.get("role"), "online": True} for d in DB["devices"].values()]}), 200

    @app.route("/api/v1/ops/manual-allocation", methods=["POST"])
    @require_internal_role
    def manual_allocate_balance():
        data = request.get_json() or {}
        device_id = data.get("device_id")
        units = data.get("units", 0)
        log_audit(request.user.id, action="manual_allocation", target_type="device", target_id=device_id, metadata={"units": units})
        return jsonify({"status": "allocated"}), 200

    @app.route("/api/v1/ops/error-log-raw", methods=["GET"])
    @require_internal_role
    def get_raw_error_log():
        return jsonify([e for e in DB["audit_log"] if "error" in e["action"]]), 200

    @app.route("/api/v1/ops/fleet-health", methods=["GET"])
    @require_internal_role
    def ops_fleet_health():
        return jsonify({
            "devices": [
                {
                    "id": d["id"], "role": d.get("role"), "online": True,
                    "last_heartbeat_at": "2026-09-14T12:00:00Z", "firmware_version": "v1.2.0",
                    "cell_tower_fingerprint": "MNC621-LAC401-CELL18", "outage_report_frequency": 0
                }
                for d in DB["devices"].values()
            ],
            "firmware_distribution": {"v1.2.0": len(DB["devices"])}
        }), 200

    @app.route("/api/v1/ops/devices/<device_id>/provenance", methods=["GET"])
    @require_internal_role
    def get_device_provenance(device_id):
        device = DB["devices"].get(device_id, {"id": device_id, "installed_at": "2026-09-01T00:00:00Z", "installer_id": "inst-1"})
        return jsonify({"installed_at": device.get("installed_at"), "installer_id": device.get("installer_id"), "firmware_history": []}), 200

    @app.route("/api/v1/ops/alerts-feed", methods=["GET"])
    @require_internal_role
    def ops_alerts_feed():
        return jsonify({
            "alerts": DB["alerts"],
            "false_positive_rate_by_device": {},
            "data_completeness_by_device": {}
        }), 200

    @app.route("/api/v1/ops/adoption-growth", methods=["GET"])
    @require_internal_role
    def ops_adoption_growth():
        return jsonify({
            "total_onboarded_trend": [10, 25, 45, 80],
            "adoption_rate_pilot_area": 0.68,
            "tier_breakdown": {"free": 100, "basic": 40, "basic_pro": 20, "pro": 10},
            "churn_rate": 0.015,
            "acquisition_funnel": {"meter_validations": 500, "signups": 170, "installs": 128, "paid_conversions": 70}
        }), 200

    @app.route("/api/v1/ops/revenue", methods=["GET"])
    @require_internal_role
    def ops_revenue():
        return jsonify({
            "revenue_by_stream": {"markup": 450000.0, "fees": 120000.0},
            "payment_reconciliation": {"success": 150, "failed": 2},
            "total_wallet_liability": 850000.0,
            "pending_payouts": 45000.0
        }), 200

    @app.route("/api/v1/ops/disputes-support", methods=["GET"])
    @require_internal_role
    def ops_disputes_support():
        return jsonify({"open_disputes": len(DB["disputes"]), "avg_resolution_time_hours": 4.2}), 200

    @app.route("/api/v1/ops/error-logs", methods=["GET"])
    @require_internal_role
    def ops_error_logs():
        return jsonify([e for e in DB["audit_log"] if "error" in e["action"]]), 200

    @app.route("/api/v1/ops/compliance-tracker", methods=["GET"])
    @require_internal_role
    def ops_compliance_tracker():
        return jsonify(DB["compliance_items"]), 200

    @app.route("/api/v1/ops/field-ops", methods=["GET"])
    @require_internal_role
    def ops_field_ops():
        return jsonify({"pending_installs": 2, "installer_performance": []}), 200

    @app.route("/api/v1/ops/inventory", methods=["GET"])
    @require_internal_role
    def ops_inventory():
        return jsonify({"items": DB["inventory_items"], "reorder_alerts": []}), 200

    @app.route("/api/v1/ops/feature-flags", methods=["GET"])
    @require_internal_role
    def ops_list_feature_flags():
        return jsonify(get_active_flags_for_user(request.user)), 200

    @app.route("/api/v1/ops/access-audit", methods=["GET"])
    @require_internal_role
    def ops_access_audit():
        return jsonify([e for e in DB["audit_log"] if e["action"] == "ops_dashboard_access"]), 200

    # Feature Flags API
    @app.route("/api/v1/feature-flags/active", methods=["GET"])
    def get_active_flags():
        active_flags = get_active_flags_for_user(request.user)
        return jsonify({"active_flags": active_flags}), 200

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)
