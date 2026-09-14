import React, { useState } from 'react';
import { fetchWithAuth } from '../../../../lib/api';

interface RoomItem {
  id: string;
  label: string;
  invite_link: string;
}

export default function NewBuildingPage() {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [meterType, setMeterType] = useState<'with_meter' | 'no_meter'>('with_meter');
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [roomLabel, setRoomLabel] = useState('');
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetchWithAuth('/api/v1/buildings', {
        method: 'POST',
        body: JSON.stringify({ name, address, meter_type: meterType }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to create building');
        return;
      }
      setBuildingId(data.building_id);
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buildingId || !roomLabel.trim()) return;

    try {
      const response = await fetchWithAuth(`/api/v1/buildings/${buildingId}/rooms`, {
        method: 'POST',
        body: JSON.stringify({ label: roomLabel.trim() }),
      });
      const data = await response.json();
      if (response.ok) {
        setRooms([...rooms, { id: data.room_id, label: roomLabel.trim(), invite_link: data.invite_link }]);
        setRoomLabel('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: 'var(--sp-6) var(--sp-4)', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--sc-text)', marginBottom: 'var(--sp-6)' }}>
        Landlord Onboarding — New Building
      </h1>

      {!buildingId ? (
        <form onSubmit={handleCreateBuilding} className="sc-glass-card" style={{ padding: 'var(--sp-6)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <div>
            <label style={{ fontSize: '13px', color: 'var(--sc-text-muted)', display: 'block', marginBottom: '6px' }}>
              Building Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Palm Grove Heights"
              style={{ width: '100%', height: '48px', borderRadius: 'var(--r-pill)', background: 'rgba(11,27,43,0.6)', border: '1px solid var(--sc-slate)', color: 'var(--sc-text)', padding: '0 var(--sp-4)', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '13px', color: 'var(--sc-text-muted)', display: 'block', marginBottom: '6px' }}>
              Address
            </label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 14 Commercial Avenue, Yaba, Lagos"
              style={{ width: '100%', height: '48px', borderRadius: 'var(--r-pill)', background: 'rgba(11,27,43,0.6)', border: '1px solid var(--sc-slate)', color: 'var(--sc-text)', padding: '0 var(--sp-4)', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '13px', color: 'var(--sc-text-muted)', display: 'block', marginBottom: '6px' }}>
              Meter Setup
            </label>
            <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
              <button
                type="button"
                onClick={() => setMeterType('with_meter')}
                style={{
                  flex: 1, height: '48px', borderRadius: 'var(--r-pill)',
                  border: `1px solid ${meterType === 'with_meter' ? 'var(--sc-green)' : 'var(--sc-slate)'}`,
                  background: meterType === 'with_meter' ? 'rgba(46,230,168,0.15)' : 'transparent',
                  color: 'var(--sc-text)', fontWeight: 600, cursor: 'pointer'
                }}
              >
                With Meter
              </button>
              <button
                type="button"
                onClick={() => setMeterType('no_meter')}
                style={{
                  flex: 1, height: '48px', borderRadius: 'var(--r-pill)',
                  border: `1px solid ${meterType === 'no_meter' ? 'var(--sc-green)' : 'var(--sc-slate)'}`,
                  background: meterType === 'no_meter' ? 'rgba(46,230,168,0.15)' : 'transparent',
                  color: 'var(--sc-text)', fontWeight: 600, cursor: 'pointer'
                }}
              >
                No Meter (Unmetered)
              </button>
            </div>
          </div>

          {error && <div style={{ color: 'var(--sc-alert)', fontSize: '14px' }}>{error}</div>}

          <button type="submit" className="sc-btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Building & Add Rooms'}
          </button>
        </form>
      ) : (
        <div className="sc-glass-card" style={{ padding: 'var(--sp-6)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--sc-green)', marginTop: 0 }}>
            Building Created! Add Rooms
          </h2>

          <form onSubmit={handleAddRoom} style={{ display: 'flex', gap: 'var(--sp-2)', margin: 'var(--sp-4) 0' }}>
            <input
              type="text"
              placeholder="e.g. Room 3 / Flat 2B"
              value={roomLabel}
              onChange={(e) => setRoomLabel(e.target.value)}
              style={{ flex: 1, height: '48px', borderRadius: 'var(--r-pill)', background: 'rgba(11,27,43,0.6)', border: '1px solid var(--sc-slate)', color: 'var(--sc-text)', padding: '0 var(--sp-4)' }}
            />
            <button type="submit" className="sc-btn-primary">Add Room</button>
          </form>

          <div>
            <h3 style={{ fontSize: '16px', color: 'var(--sc-text-muted)' }}>Rooms Added ({rooms.length})</h3>
            {rooms.map((r) => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--sp-3)', background: 'rgba(18,38,58,0.5)', borderRadius: 'var(--r-sm)', marginBottom: 'var(--sp-2)' }}>
                <span style={{ fontWeight: 600 }}>{r.label}</span>
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(r.invite_link)}
                  style={{ background: 'transparent', border: '1px solid var(--sc-green)', color: 'var(--sc-green)', borderRadius: 'var(--r-pill)', padding: '6px 16px', cursor: 'pointer' }}
                >
                  Copy Invite Link
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
