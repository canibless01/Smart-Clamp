export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '/api/v1'

export type ApiError = { code: string; message: string; request_id: string; retry_after_seconds?: number }

export async function apiFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
    cache: 'no-store'
  })
  if (!res.ok) {
    let body: any = {}
    try { body = await res.json() } catch {}
    throw Object.assign(new Error(body.message || `API ${res.status}`), { status: res.status, body })
  }
  if (res.status === 204) return null
  return res.json()
}

export function formatNaira(kobo: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(kobo / 100)
}
export function formatKwh(mwh: number) { return (mwh / 1000).toFixed(3) + ' kWh' }

export const STATES = {
  stale: { label: 'Stale', class: 'badge-stale' },
  offline: { label: 'Offline', class: 'badge-offline' },
  unknown: { label: 'Unknown', class: 'badge-unknown' },
  verified: { label: 'Verified', class: 'badge-verified' }
}
