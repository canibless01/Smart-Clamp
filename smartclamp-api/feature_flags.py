from functools import wraps
from flask import request, jsonify

# In-memory feature flags store for development and testing
# Schema matches the feature_flags table:
# key -> { 'enabled_globally': bool, 'enabled_for_tiers': list[str], 'enabled_for_building_ids': list[str] }
_FEATURE_FLAGS_STORE = {}

def set_flag(key, enabled_globally=False, enabled_for_tiers=None, enabled_for_building_ids=None):
    _FEATURE_FLAGS_STORE[key] = {
        'key': key,
        'enabled_globally': enabled_globally,
        'enabled_for_tiers': enabled_for_tiers or [],
        'enabled_for_building_ids': enabled_for_building_ids or []
    }

def get_flag(flag_key):
    return _FEATURE_FLAGS_STORE.get(flag_key)

def is_feature_enabled(flag_key, user):
    flag = get_flag(flag_key)
    if not flag:
        return False
    if flag.get('enabled_globally'):
        return True
    if user:
        user_tier = getattr(user, 'subscription_tier', None)
        if user_tier and user_tier in (flag.get('enabled_for_tiers') or []):
            return True
        user_building_id = getattr(user, 'building_id', None)
        if user_building_id and user_building_id in (flag.get('enabled_for_building_ids') or []):
            return True
    return False

def feature_required(flag_key):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user = getattr(request, 'user', None)
            if not is_feature_enabled(flag_key, user=user):
                return jsonify({"error": "feature_not_available"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator

def get_active_flags_for_user(user):
    active_flags = []
    for flag_key in _FEATURE_FLAGS_STORE:
        if is_feature_enabled(flag_key, user):
            active_flags.append(flag_key)
    return active_flags
