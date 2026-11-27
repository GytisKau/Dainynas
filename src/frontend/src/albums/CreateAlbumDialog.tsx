import { useId, useRef, useState, type SubmitEvent } from 'react'
import { useToast } from '../components/useToast'

type Props = {
  token: string
  onCreated: () => void
}

const primaryButton =
  'min-h-11 cursor-pointer rounded-lg bg-accent px-4 font-semibold text-on-accent ' +
  'transition-colors hover:bg-accent-hover disabled:cursor-wait disabled:opacity-60'

const fieldClass =
  'w-full rounded-lg border border-field-border bg-field px-3 py-2 text-ink'

export default function CreateAlbumDialog({ token, onCreated }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const headingId = useId()
  const notify = useToast()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function openDialog() {
    const element = dialog.current
    if (!element) return

    element.querySelector('form')?.reset()
    setError('')
    element.showModal()
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return

    const fields = new FormData(event.currentTarget)
    const title = String(fields.get('title') ?? '').trim()
    const description = String(fields.get('description') ?? '').trim()

    if (!title) {
      setError('Įrašyk albumo pavadinimą.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const response = await fetch('/api/Albums', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description: description || null,
          songIds: [],
        }),
      })

      if (!response.ok) {
        if (response.status === 401) {
          setError('Sesija baigėsi. Prisijunk iš naujo.')
        } else if (response.status === 400) {
          setError('Patikrink albumo pavadinimą ir aprašymą.')
        } else {
          setError(`Albumo sukurti nepavyko (HTTP ${response.status}).`)
        }
        return
      }

      dialog.current?.close()
      notify('success', `Albumas „${title}“ sukurtas.`)
      onCreated()
    } catch {
      setError(
        'Nepavyko gauti serverio atsakymo. Prieš kartodamas patikrink „Mano“ albumų sąrašą.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button type="button" onClick={openDialog} className={primaryButton}>
        Sukurti albumą
      </button>

      <dialog
        ref={dialog}
        aria-labelledby={headingId}
        onCancel={(event) => {
          if (saving) event.preventDefault()
        }}
        className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md
                   overflow-y-auto rounded-xl border border-line bg-surface p-5
                   text-ink backdrop:bg-black/60 md:p-7"
      >
        <h2 id={headingId} className="text-xl font-semibold">Naujas albumas</h2>
        <p className="mt-2 text-sm text-muted">
          Albumas bus išsaugotas kaip juodraštis.
        </p>

        <form onSubmit={handleSubmit} className="mt-5">
          <fieldset disabled={saving} className="grid min-w-0 gap-4">
            <label className="grid gap-1">
              Pavadinimas (privaloma)
              <input
                name="title"
                type="text"
                required
                maxLength={200}
                autoFocus
                className={`min-h-11 ${fieldClass}`}
              />
            </label>

            <label className="grid gap-1">
              Aprašymas (nebūtina)
              <textarea
                name="description"
                rows={4}
                maxLength={2000}
                className={`resize-y ${fieldClass}`}
              />
            </label>

            {error && <p role="alert" className="text-sm">{error}</p>}

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => dialog.current?.close()}
                className="min-h-11 cursor-pointer rounded-lg border border-field-border
                           px-4 hover:bg-hover disabled:cursor-wait disabled:opacity-60"
              >
                Atšaukti
              </button>

              <button type="submit" className={primaryButton}>
                {saving ? 'Kuriama…' : 'Sukurti albumą'}
              </button>
            </div>
          </fieldset>
        </form>
      </dialog>
    </>
  )
}