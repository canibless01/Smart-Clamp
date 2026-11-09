// Client-side auth helper — thin wrapper over localStorage JWT
// JWT decode without verification (server verifies). Use only for UI routing.

function parseJwt(token: string): any | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')
    return JSON.parse(atob(base64))
  } catch { return null }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('smartclamp_token')
}
export function getRole(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('smartclamp_role')
}
export function getUserId(): string | null {
  const t = getToken()
  if (!t) return null
  const payload = parseJwt(t)
  return payload?.sub || null
}
export function isExpired(): boolean {
  const t = getToken()
  if (!t) return true
  const p = parseJwt(t)
  if (!p?.exp) return false
  return Date.now()/1000 > p.exp - 10
}
export function logout() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('smartclamp_token')
  localStorage.removeItem('smartclamp_role')
  location.href = '/login'
}
export function authHeader(): Record<string,string> {
  const t = getToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}
