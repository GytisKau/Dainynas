import { useEffect, useRef, useState } from 'react'
import type { SubmitEvent } from 'react'

const fieldClass =
  'min-h-11 w-full rounded-lg border border-field-border bg-field px-3 text-ink'

const primaryButton =
  'min-h-11 rounded-lg bg-accent px-4 font-semibold text-on-accent ' +
  'transition-colors hover:bg-accent-hover disabled:opacity-60'

export default function CreatePerformerDialog({ token }: { token: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!notice) return

    const timer = window.setTimeout(() => setNotice(''), 5000)
    return () => window.clearTimeout(timer)
  }, [notice])

  function openDialog() {
    setNotice('')
    setError('')
    dialogRef.current?.showModal()
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return

    const form = event.currentTarget
    const fields = new FormData(form)
    const name = String(fields.get('name') ?? '').trim()
    const year = String(fields.get('birthYear') ?? '')
    const residence = String(fields.get('residence') ?? '').trim()
    const photoUrl = String(fields.get('photoUrl') ?? '').trim()

    if (!name) {
      setError('Įrašyk pateikėjo vardą ir pavardę.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const response = await fetch('/api/Performers', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          name,
          birthYear: year === '' ? null : Number(year),
          residence: residence || null,
          photoUrl: photoUrl || null,
        }),
      })

      if (!response.ok) {
        const problem = await response.json().catch(() => null)
        const detail = problem?.detail || problem?.title

        if (response.status === 401) {
          setError('Sesija nebegalioja. Prisijunk iš naujo.')
        } else {
          setError(detail || `Pateikėjo išsaugoti nepavyko (HTTP ${response.status}).`)
        }
        return
      }

      const created = await response.json()
      setNotice(`Pateikėjas „${created.name}“ sukurtas.`)
      form.reset()
      dialogRef.current?.close()
    } catch {
      setError('Nepavyko gauti serverio atsakymo. Patikrink ryšį.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <button type="button" onClick={openDialog} className={primaryButton}>
        Pridėti pateikėją
      </button>

      <div
        role="status"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-50
                  sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-96"
      >
        {notice && (
          <div
            className="flex items-start gap-3 rounded-xl border border-line
                      bg-surface px-4 py-3 text-ink shadow-lg"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5 size-5 shrink-0 text-accent"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="m8 12 3 3 5-6" />
            </svg>

            <p className="wrap-anywhere text-sm font-medium">{notice}</p>
          </div>
        )}
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby="create-performer-title"
        onCancel={(event) => {
          if (saving) event.preventDefault()
        }}
        className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md
                   overflow-y-auto rounded-xl border border-line bg-surface p-5
                   text-ink backdrop:bg-black/60 md:p-7"
      >
        <h2 id="create-performer-title" className="text-xl font-semibold">
          Naujas pateikėjas
        </h2>

        <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
          <label className="grid gap-1">
            Vardas ir pavardė (privaloma)
            <input name="name" required maxLength={200} className={fieldClass} />
          </label>

          <label className="grid gap-1">
            Gimimo metai
            <input
              name="birthYear"
              type="number"
              min={1800}
              max={2100}
              step={1}
              className={fieldClass}
            />
          </label>

          <label className="grid gap-1">
            Gyvenamoji vieta
            <input name="residence" maxLength={200} className={fieldClass} />
          </label>

          <label className="grid gap-1">
            Nuotraukos nuoroda
            <input
              name="photoUrl"
              type="url"
              placeholder="https://…"
              className={fieldClass}
            />
          </label>

          {error && <p role="alert" className="text-sm">{error}</p>}

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => dialogRef.current?.close()}
              className="min-h-11 rounded-lg border border-field-border px-4 hover:bg-hover"
            >
              Atšaukti
            </button>
            <button type="submit" disabled={saving} className={primaryButton}>
              {saving ? 'Išsaugoma…' : 'Išsaugoti'}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  )
}