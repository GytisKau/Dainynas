import { useEffect, useRef, useState } from 'react'
import { refreshSession, requestLogout, restoreSession, type AuthSession } from './authApi'
import { useToast } from '../components/useToast'

export function useAuthSession() {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [message, setMessage] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)
  const [restoring, setRestoring] = useState(true)
  const [restoreFailed, setRestoreFailed] = useState(false)
  const notify = useToast()

  const current = useRef<AuthSession | null>(null)
  const refreshing = useRef<Promise<AuthSession | null> | null>(null)
  const logoutPending = useRef(false)
  const initialRestore = useRef<Promise<AuthSession | null> | null>(null)

  useEffect(() => {
    let active = true

    initialRestore.current ??= restoreSession()

    initialRestore.current
      .then((restored) => {
        if (!active) return

        current.current = restored
        setSession(restored)
      })
      .catch(() => {
        if (active) setRestoreFailed(true)
      })
      .finally(() => {
        if (active) setRestoring(false)
      })

    return () => {
      active = false
    }
  }, [])

  function saveSession(next: AuthSession | null) {
    current.current = next
    setSession(next)
    setMessage('')
  }

  function expireSession() {
    saveSession(null)
    setMessage('Sesija baigėsi. Prisijunk iš naujo.')
  }

  function renew(): Promise<AuthSession | null> {
    if (refreshing.current) return refreshing.current

    const previous = current.current
    if (!previous) return Promise.resolve(null)

    if (Date.parse(previous.refreshExpiresAt) <= Date.now()) {
      expireSession()
      return Promise.resolve(null)
    }

    const pending = refreshSession(previous.refreshToken)
      .then((next) => {
        // Kol vyko užklausa, programa galėjo pereiti prie kitos sesijos.
        if (current.current !== previous) return current.current

        if (next) saveSession(next)
        else expireSession()

        return next
      })
      .finally(() => {
        refreshing.current = null
      })

    refreshing.current = pending
    return pending
  }

  // Laikmatis ir atsijungimo mygtukas naudoja tą pačią renew funkciją.
  useEffect(() => {
    if (!session) return

    let stopped = false
    let timer: number

    async function checkExpiry() {
      if (stopped || current.current !== session || logoutPending.current) return

      const remaining = Date.parse(session!.expiresAt) - Date.now()

      if (remaining > 0) {
        timer = window.setTimeout(checkExpiry, Math.min(remaining, 2_147_483_647))
        return
      }

      try {
        await renew()
      } catch {
        if (stopped || current.current !== session) return

        setMessage('Nepavyko atnaujinti sesijos. Po 15 sekundžių bandysime dar kartą.')
        timer = window.setTimeout(checkExpiry, 15_000)
      }
    }

    // Suplanuotas pirmasis patikrinimas gali būti atšauktas per effect cleanup.
    timer = window.setTimeout(checkExpiry, 0)

    return () => {
      stopped = true
      window.clearTimeout(timer)
    }
  }, [session, loggingOut])

  async function logout() {
    if (logoutPending.current || !current.current) return

    logoutPending.current = true
    setLoggingOut(true)
    setMessage('')

    try {
      let active = current.current

      if (refreshing.current || Date.parse(active.expiresAt) <= Date.now()) {
        const renewed = await renew()
        if (!renewed) return
        active = renewed
      }

      let response = await requestLogout(active.token)

      // Serveris gali atmesti žetoną anksčiau, nei tikisi kliento laikrodis.
      if (response.status === 401) {
        const renewed = await renew()
        if (!renewed) return
        response = await requestLogout(renewed.token)
      }

      if (response.status !== 204) {
        throw new Error(`Atsijungimo serveris nepatvirtino (HTTP ${response.status}).`)
      }

      saveSession(null)
      notify('success', 'Sėkmingai atsijungei.')
    } catch (error) {
      notify(
        'error',
        error instanceof TypeError
          ? 'Nepavyko susisiekti su serveriu. Pabandyk atsijungti dar kartą.'
          : error instanceof Error
            ? error.message
            : 'Atsijungti nepavyko.',
      )
    } finally {
      logoutPending.current = false
      setLoggingOut(false)
    }
  }

  return { 
    session, 
    saveSession, 
    logout, 
    loggingOut, 
    message, 
    restoring, 
    restoreFailed 
  }
}