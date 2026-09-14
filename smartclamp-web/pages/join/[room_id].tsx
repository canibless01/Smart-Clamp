import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { fetchWithAuth } from '../../lib/api';

export default function JoinRoomPage() {
  const router = useRouter();
  const { room_id } = router.query;
  const [status, setStatus] = useState<'joining' | 'joined' | 'error'>('joining');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!room_id) return;

    const join = async () => {
      try {
        const response = await fetchWithAuth(`/api/v1/rooms/${room_id}/join`, {
          method: 'POST'
        });
        const data = await response.json();
        if (response.ok) {
          setStatus('joined');
          setTimeout(() => {
            window.location.href = '/dashboard/tenant';
          }, 1500);
        } else {
          setStatus('error');
          setErrorMsg(data.error || 'Failed to join room');
        }
      } catch (err) {
        setStatus('error');
        setErrorMsg('Network error joining room');
      }
    };

    join();
  }, [room_id]);

  return (
    <div style={{ minHeight: '100vh', padding: 'var(--sp-6) var(--sp-4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="sc-glass-card" style={{ width: '100%', maxWidth: '420px', padding: 'var(--sp-6)', textAlign: 'center' }}>
        {status === 'joining' && (
          <div>
            <h2 style={{ fontSize: '20px', color: 'var(--sc-text)' }}>Joining Room...</h2>
            <p style={{ color: 'var(--sc-text-muted)' }}>Setting up your tenant access</p>
          </div>
        )}

        {status === 'joined' && (
          <div>
            <span className="sc-verified-dot" style={{ width: '16px', height: '16px', marginBottom: 'var(--sp-2)' }} />
            <h2 style={{ fontSize: '22px', color: 'var(--sc-green)' }}>Successfully Joined!</h2>
            <p style={{ color: 'var(--sc-text-muted)' }}>Redirecting to your tenant dashboard...</p>
          </div>
        )}

        {status === 'error' && (
          <div>
            <h2 style={{ fontSize: '20px', color: 'var(--sc-alert)' }}>Unable to Join</h2>
            <p style={{ color: 'var(--sc-text-muted)' }}>{errorMsg}</p>
          </div>
        )}
      </div>
    </div>
  );
}
