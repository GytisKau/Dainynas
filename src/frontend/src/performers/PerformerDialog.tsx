import { useRef, useState, useId } from 'react'
import type { SubmitEvent } from 'react'

import type { PerformerDetails } from '../songs/types'
import { useToast } from '../components/useToast'

const fieldClass =
  'min-h-11 w-full rounded-lg border border-field-border bg-field px-3 text-ink'

const primaryButton =
  'min-h-11 rounded-lg bg-accent px-4 font-semibold text-on-accent ' +
  'transition-colors hover:bg-accent-hover disabled:opacity-60'

export type EditablePerformer = PerformerDetails & {
  id: number | string
  publicationStatus: string
}

type PerformerDialogProps = {
  token: string
  performer?: EditablePerformer
  onSaved?: () => void
}

export default function PerformerDialog({
  token,
  performer,
  onSaved,
}: PerformerDialogProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const notify = useToast()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  
  function openDialog() {
    setError('')
    dialogRef.current?.querySelector('form')?.reset()
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
      const url = performer
        ? `/api/Performers/${encodeURIComponent(String(performer.id))}`
        : '/api/Performers'

      const response = await fetch(url, {
        method: performer ? 'PUT' : 'POST',
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

        const messages: Record<number, string> = {
          401: 'Sesija nebegalioja. Prisijunk iš naujo.',
          403: 'Neturi teisės redaguoti šio pateikėjo.',
          404: 'Pateikėjas nerastas.',
          409: 'Pakeitimų šiuo metu išsaugoti negalima.',
        }

        setError(
          problem?.detail ||
          messages[response.status] ||
          problem?.title ||
          `Nepavyko išsaugoti pateikėjo (HTTP ${response.status}).`,
        )
        return
      }

      let message: string

      if (performer) {
        message = response.status === 202
          ? `Pateikėjo „${name}“ pakeitimai priimti apdoroti.`
          : `Pateikėjo „${name}“ duomenys atnaujinti.`
      } else {
        const created = await response.json()
        message = `Pateikėjas „${created.name}“ sukurtas.`
      }

      form.reset()
      dialogRef.current?.close()
      onSaved?.()
      notify('success', message)
    } catch {
      setError('Nepavyko gauti serverio atsakymo. Patikrink ryšį.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <button type="button" onClick={openDialog} className={primaryButton}>
        {performer ? 'Redaguoti' : 'Pridėti pateikėją'}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onCancel={(event) => {
          if (saving) event.preventDefault()
        }}
        className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md
                   overflow-y-auto rounded-xl border border-line bg-surface p-5
                   text-ink backdrop:bg-black/60 md:p-7"
      >
        <h2 id={titleId} className="text-xl font-semibold">
          {performer ? 'Redaguoti pateikėją' : 'Naujas pateikėjas'}
        </h2>

        <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
          <label className="grid gap-1">
            Vardas ir pavardė (privaloma)
            <input name="name" required maxLength={200} defaultValue={performer?.name ?? ''} className={fieldClass} autoComplete='off' />
          </label>

          <label className="grid gap-1">
            Gimimo metai
            <input
              name="birthYear"
              type="number"
              min={1800}
              max={2100}
              step={1}
              defaultValue={performer?.birthYear ?? ''}
              className={fieldClass}
            />
          </label>

          <label className="grid gap-1">
            Gyvenamoji vieta
            <input name="residence" maxLength={200} defaultValue={performer?.residence ?? ''} className={fieldClass} />
          </label>

          <label className="grid gap-1">
            Nuotraukos nuoroda
            <input
              name="photoUrl"
              type="url"
              placeholder="https://…"
              defaultValue={performer?.photoUrl ?? ''}
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