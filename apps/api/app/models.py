"""
SQLAlchemy models for SmartClamp. Mirrors database/migrations schema.
For local dev we use SQLite; production uses Postgres/Supabase via DATABASE_URL.
"""
from sqlalchemy import Column, String, Integer, Boolean, Numeric, DateTime, ForeignKey, Enum, Text, JSON, Index, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid, datetime

Base = declarative_base()

def now():
    return datetime.datetime.utcnow()

# Enums as strings for SQLite compatibility
class User(Base):
    __tablename__='users'
    id=Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    phone=Column(String, unique=True, nullable=False)
    email=Column(String, unique=True, nullable=True)
    full_name=Column(String, nullable=False)
    role=Column(String, nullable=False)  # user_role
    subscription_tier=Column(String, default='free')
    created_at=Column(DateTime, default=now)
    updated_at=Column(DateTime, default=now)

class Building(Base):
    __tablename__='buildings'
    id=Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    landlord_id=Column(String, ForeignKey('users.id'), nullable=False)
    name=Column(String, nullable=False)
    address=Column(String, nullable=False)
    meter_type=Column(String, nullable=False)
    region=Column(String, default='futa')
    timezone=Column(String, default='Africa/Lagos')
    topology_version=Column(Integer, default=1)
    created_at=Column(DateTime, default=now)

class Room(Base):
    __tablename__='rooms'
    id=Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    building_id=Column(String, ForeignKey('buildings.id'), nullable=False)
    label=Column(String, nullable=False)
    created_at=Column(DateTime, default=now)

class Occupancy(Base):
    __tablename__='occupancies'
    id=Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    room_id=Column(String, ForeignKey('rooms.id'), nullable=False)
    tenant_id=Column(String, ForeignKey('users.id'), nullable=False)
    start_at=Column(DateTime, nullable=False, default=now)
    end_at=Column(DateTime, nullable=True)
    created_at=Column(DateTime, default=now)
    __table_args__=(Index('idx_occupancy_room_active','room_id','end_at'),)

class Device(Base):
    __tablename__='devices'
    id=Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    role=Column(String, nullable=False)
    has_relay=Column(Boolean, default=False)
    has_voltage_sensor=Column(Boolean, default=False)
    owner_id=Column(String, ForeignKey('users.id'))
    room_id=Column(String, ForeignKey('rooms.id'))
    building_id=Column(String, ForeignKey('buildings.id'))
    pole_group_id=Column(String, nullable=True)
    linked_meter_id=Column(String, nullable=True)
    install_state=Column(String, default='provisioned')
    calibration_status=Column(String, default='uncalibrated')
    config_epoch=Column(Integer, default=1)
    key_epoch=Column(Integer, default=1)
    # device_hmac_key stored encrypted — never returned to client
    created_at=Column(DateTime, default=now)

class Wallet(Base):
    __tablename__='wallets'
    id=Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    device_id=Column(String, ForeignKey('devices.id'), nullable=True)
    building_id=Column(String, ForeignKey('buildings.id'), nullable=True)
    linked_meter_id=Column(String, nullable=True)
    utility_type=Column(String, default='electricity')
    available_kobo=Column(Integer, default=0)
    reserved_kobo=Column(Integer, default=0)
    ledger_version=Column(Integer, default=0)
    updated_at=Column(DateTime, default=now)

class LedgerEntry(Base):
    __tablename__='ledger_entries'
    id=Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    wallet_id=Column(String, ForeignKey('wallets.id'), nullable=False)
    amount_kobo=Column(Integer, nullable=False)
    direction=Column(String, nullable=False) # debit/credit
    kind=Column(String, nullable=False)
    provider_reference=Column(String, unique=True, nullable=True)
    created_at=Column(DateTime, default=now)

class Reading(Base):
    __tablename__='readings'
    id=Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    device_id=Column(String, ForeignKey('devices.id'), nullable=False)
    boot_id=Column(String, nullable=False)
    seq=Column(Integer, nullable=False)
    payload_hash=Column(String, nullable=False)
    measured_at=Column(DateTime, nullable=True)
    received_at=Column(DateTime, default=now)
    clock_quality=Column(String, default='unknown')
    quality=Column(String, default='valid')
    voltage_mv=Column(Integer, nullable=True)
    current_ma=Column(Integer, nullable=True)
    real_power_mw=Column(Integer, nullable=True)
    import_mwh=Column(Integer, nullable=True)
    export_mwh=Column(Integer, nullable=True)
    __table_args__=(UniqueConstraint('device_id','boot_id','seq', name='uq_device_boot_seq'),)
