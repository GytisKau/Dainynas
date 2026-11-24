import { useEffect, useRef, useState } from 'react'
import type { SubmitEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { authenticate, type AuthMode, type AuthSession } from './authApi'

type AuthPageProps = {
  mode: AuthMode
  onAuthenticated: (session: AuthSession) => void
}

const inputClass =
  'min-h-11 w-full rounded-lg border border-field-border bg-field px-3 text-ink'

export default function AuthPage({ mode, onAuthenticated }: AuthPageProps) {
  const register = mode === 'register'
  const navigate = useNavigate()
  const request = useRef<AbortController | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    return () => request.current?.abort()
  }, [])

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (request.current) return

    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') ?? '').trim()
    const password = String(form.get('password') ?? '')

    const controller = new AbortController()
    request.current = controller
    setPending(true)
    setError('')

    try {
      const session = await authenticate(mode, email, password, controller.signal)

      if (!controller.signal.aborted) {
        onAuthenticated(session)
        navigate('/', { replace: true })
      }
    } catch (cause) {
      if (!controller.signal.aborted) {
        setError(
          cause instanceof TypeError
            ? 'Nepavyko susisiekti su serveriu. Bandyk dar kartą.'
            : cause instanceof Error
              ? cause.message
              : 'Užklausos įvykdyti nepavyko.',
        )
      }
    } finally {
      request.current = null
      if (!controller.signal.aborted) setPending(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
      <section className="rounded-xl border border-line bg-surface p-5 md:p-7">
        <h1 className="text-2xl font-semibold text-ink">
          {register ? 'Sukurti paskyrą' : 'Prisijungti'}
        </h1>

        <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
          <div className="grid gap-1">
            <label htmlFor="auth-email">El. paštas</label>
            <input
              id="auth-email"
              name="email"
              type="email"
              autoComplete="username"
              required
              className={inputClass}
            />
          </div>

          <div className="grid gap-1">
            <label htmlFor="auth-password">Slaptažodis</label>
            <input
              id="auth-password"
              name="password"
              type="password"
              autoComplete={register ? 'new-password' : 'current-password'}
              minLength={register ? 8 : undefined}
              aria-describedby={register ? 'password-hint' : undefined}
              required
              className={inputClass}
            />
            {register && (
              <p id="password-hint" className="text-sm text-muted">
                Bent 8 simboliai.
              </p>
            )}
          </div>

          {error && <p role="alert" className="text-sm text-ink">{error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="min-h-11 rounded-lg bg-accent px-4 font-semibold text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60"
          >
            {pending ? 'Palaukite…' : register ? 'Sukurti paskyrą' : 'Prisijungti'}
          </button>
        </form>

        <p className="mt-5 text-sm text-muted">
          {register ? 'Jau turi paskyrą? ' : 'Dar neturi paskyros? '}
          <Link
            to={register ? '/prisijungti' : '/registracija'}
            className="text-accent underline underline-offset-4"
          >
            {register ? 'Prisijungti' : 'Registruotis'}
          </Link>
        </p>
      </section>
    </main>
  )
}