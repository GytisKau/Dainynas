import { useEffect, useId, useRef, useState, type SubmitEvent } from 'react'
import { useToast } from '../components/useToast'
import { saveAlbum } from './albumApi'
import type { Album } from './types'

const primaryButton =
  'min-h-11 cursor-pointer rounded-lg bg-accent px-4 font-semibold text-on-accent ' +
  'transition-colors hover:bg-accent-hover disabled:cursor-wait disabled:opacity-60'

const fieldClass =
  'w-full rounded-lg border border-field-border bg-field px-3 py-2 text-ink'

type CreateProps = {
  token: string
  onCreated: () => void
}

export default function CreateAlbumDialog({ token, onCreated }: CreateProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={primaryButton}>
        Sukurti albumą
      </button>

      {open && (
        <AlbumFormDialog
          token={token}
          onClose={() => setOpen(false)}
          onSaved={onCreated}
        />
      )}
    </>
  )
}

type FormProps = {
  token: string
  album?: Album
  onClose: () => void
  onSaved: () => void
}

export function AlbumFormDialog({ token, album, onClose, onSaved }: FormProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const headingId = useId()
  const notify = useToast()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const proposing = album?.publicationStatus === 'Published'
  const heading = proposing ? 'Siūlyti pakeitimus' : album ? 'Redaguoti albumą' : 'Naujas albumas'
  const submitLabel = proposing ? 'Pateikti pakeitimus' : album ? 'Išsaugoti' : 'Sukurti albumą'

  useEffect(() => {
    const element = dialog.current
    if (element && !element.open) element.showModal()
  }, [])

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
      const result = await saveAlbum(token, title, description, album)
      const message = {
        created: `Albumas „${title}“ sukurtas.`,
        updated: `Albumas „${title}“ atnaujintas.`,
        proposed: 'Albumo pakeitimai pateikti moderatoriui peržiūrėti.',
      }

      dialog.current?.close()
      notify('success', message[result])
      onSaved()
    } catch (error) {
      setError(error instanceof TypeError
        ? 'Nepavyko gauti serverio atsakymo. Prieš kartodamas patikrink albumo būseną.'
        : error instanceof Error ? error.message : 'Albumo išsaugoti nepavyko.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby={headingId}
      onClose={onClose}
      onCancel={(event) => {
        if (saving) event.preventDefault()
      }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md
                 overflow-y-auto rounded-xl border border-line bg-surface p-5
                 text-ink backdrop:bg-black/60 md:p-7"
    >
      <h2 id={headingId} className="text-xl font-semibold">{heading}</h2>

      {proposing && (
        <p className="mt-2 text-sm text-muted">
          Pakeitimai taps vieši, kai juos patvirtins moderatorius.
        </p>
      )}
      {!album && <p className="mt-2 text-sm text-muted">Albumas bus išsaugotas kaip juodraštis.</p>}

      <form onSubmit={handleSubmit} className="mt-5">
        <fieldset disabled={saving} className="grid min-w-0 gap-4">
          <label className="grid gap-1">
            Pavadinimas (privaloma)
            <input
              name="title"
              required
              maxLength={200}
              defaultValue={album?.title ?? ''}
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
              defaultValue={album?.description ?? ''}
              className={`resize-y ${fieldClass}`}
            />
          </label>

          {error && <p role="alert" className="text-sm">{error}</p>}

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className="min-h-11 cursor-pointer rounded-lg border border-field-border
                         px-4 hover:bg-hover disabled:cursor-wait"
            >
              Atšaukti
            </button>
            <button type="submit" className={primaryButton}>
              {saving ? 'Siunčiama…' : submitLabel}
            </button>
          </div>
        </fieldset>
      </form>
    </dialog>
  )
}