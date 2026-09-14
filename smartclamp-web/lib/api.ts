const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

export async function fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

export async function fetchActiveFeatureFlags(): Promise<string[]> {
  try {
    const response = await fetchWithAuth('/api/v1/feature-flags/active');
    if (!response.ok) {
      console.error('Failed to fetch feature flags:', response.statusText);
      return [];
    }
    const data = await response.json();
    return data.active_flags || [];
  } catch (error) {
    console.error('Error fetching feature flags:', error);
    return [];
  }
}
