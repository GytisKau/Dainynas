export type AuthMode = 'login' | 'register'

export type AuthSession = {
  token: string
  refreshToken: string
  expiresAt: string
  refreshExpiresAt: string
  role: string
}

export async function authenticate(
  mode: AuthMode,
  email: string,
  password: string,
  signal: AbortSignal,
): Promise<AuthSession> {
  const response = await fetch(`/api/Auth/${mode}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ email, password }),
    signal,
  })

  if (response.ok) {
    return response.json()
  }

  if (response.status === 401) {
    throw new Error('Neteisingas el. paštas arba slaptažodis.')
  }

  if (response.status === 400) {
    const problem = await response.json().catch(() => null)

    if (typeof problem?.detail === 'string' && problem.detail.trim()) {
      throw new Error(problem.detail)
    }

    throw new Error('Patikrink el. paštą ir slaptažodį.')
  }

  throw new Error(`Serveris negalėjo įvykdyti užklausos (HTTP ${response.status}).`)
}

export async function refreshSession(
  refreshToken: string,
): Promise<AuthSession | null> {
  const response = await fetch('/api/Auth/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  })

  if (response.status === 401) return null

  if (!response.ok) {
    throw new Error(`Sesijos atnaujinti nepavyko (HTTP ${response.status}).`)
  }

  return response.json()
}

export function requestLogout(token: string): Promise<Response> {
  return fetch('/api/Auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function restoreSession(): Promise<AuthSession | null> {
  const response = await fetch('/api/auth/restore', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      'X-Dainynas-Request': '1',
    },
  })

  if (response.status === 204 || response.status === 401) {
    return null
  }

  if (!response.ok) {
    throw new Error(`Nepavyko atkurti sesijos (HTTP ${response.status}).`)
  }

  return response.json()
}