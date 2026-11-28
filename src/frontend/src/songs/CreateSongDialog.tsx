import { useEffect, useId, useRef, useState, type SubmitEvent } from 'react'
import { loadPerformerOptions } from '../catalog/loadPerformerOptions'
import type { PerformerOption } from '../catalog/types'
import { useToast } from '../components/useToast'

type Props = {
  token: string
  onCreated: () => void
}

type OptionsState =
  | { status: 'loading' }
  | { status: 'ready'; items: PerformerOption[] }
  | { status: 'error' }

const fieldClass =
  'min-h-11 w-full min-w-0 rounded-lg border border-field-border bg-field px-3 py-2 text-ink'

const primaryButton =
  'min-h-11 cursor-pointer rounded-lg bg-accent px-4 font-semibold text-on-accent ' +
  'transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60'

export default function CreateSongDialog({ token, onCreated }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={primaryButton}>
        Sukurti dainą
      </button>

      {open && (
        <SongFormDialog
          token={token}
          onCreated={onCreated}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

async function createPerformer(name: string, token: string): Promise<PerformerOption> {
  const response = await fetch('/api/Performers', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  })

  if (response.status === 201) return response.json()

  switch (response.status) {
    case 400:
      throw new Error('Patikrink pateikėjo vardą. Galima įvesti iki 200 simbolių.')
    case 401:
      throw new Error('Sesija baigėsi. Prisijunk iš naujo.')
    default:
      throw new Error(`Pateikėjo sukurti nepavyko (HTTP ${response.status}).`)
  }
}

function SongFormDialog({
  token, onCreated, onClose,
}: Props & { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const headingId = useId()
  const notify = useToast()
  const [options, setOptions] = useState<OptionsState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [performerMode, setPerformerMode] = useState<'existing' | 'new'>('existing')
  const [createdPerformer, setCreatedPerformer] = useState<PerformerOption | null>(null)

  useEffect(() => {
    const element = dialog.current
    if (element && !element.open) element.showModal()
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    async function loadOptions() {
      try {
        const [publicItems, myItems] = await Promise.all([
          loadPerformerOptions('public', controller.signal),
          loadPerformerOptions('mine', controller.signal, token),
        ])

        if (controller.signal.aborted) return

        // Savo paskelbtą pateikėją gauname iš abiejų sąrašų.
        const byId = new Map<string, PerformerOption>()
        for (const person of [...publicItems, ...myItems]) {
          byId.set(String(person.id), person)
        }

        const items = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'lt'))
        setOptions({ status: 'ready', items })
      } catch {
        if (!controller.signal.aborted) setOptions({ status: 'error' })
      }
    }

    void loadOptions()
    return () => controller.abort()
  }, [token, attempt])

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return

    const fields = new FormData(event.currentTarget)
    const text = (name: string) => String(fields.get(name) ?? '').trim()

    const title = text('title')
    const year = text('recordingYear')
    const newName = text('newPerformerName')
    let performerId = createdPerformer?.id ?? text('performerId')

    if (!title) {
      setError('Įrašyk dainos pavadinimą.')
      return
    }

    if (!performerId && performerMode === 'existing') {
      setError('Pasirink pateikėją.')
      return
    }

    if (!performerId && !newName) {
      setError('Įrašyk naujo pateikėjo vardą.')
      return
    }

    setSaving(true)
    setError('')

    try {
      if (!performerId) {
        const performer = await createPerformer(newName, token)
        performerId = performer.id
        setCreatedPerformer(performer)
      }

      const response = await fetch('/api/Songs', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          performerId: Number(performerId),
          lyrics: text('lyrics') || null,
          recordingYear: year ? Number(year) : null,
          recordingPlace: text('recordingPlace') || null,
          audioUrl: text('audioUrl') || null,
          externalArchiveUrl: text('externalArchiveUrl') || null,
        }),
      })

      if (response.status !== 201) {
        switch (response.status) {
          case 400:
            throw new Error('Dainos išsaugoti nepavyko. Patikrink įvestus duomenis.')
          case 401:
            throw new Error('Sesija baigėsi. Prisijunk iš naujo.')
          case 404:
            throw new Error('Pasirinktas pateikėjas nebepasiekiamas. Pasirink kitą.')
          default:
            throw new Error(`Dainos sukurti nepavyko (HTTP ${response.status}).`)
        }
      }

      dialog.current?.close()
      notify('success', `Daina „${title}“ išsaugota kaip juodraštis.`)
      onCreated()
    } catch (error) {
      if (error instanceof TypeError && !performerId) {
        // Serveris galėjo išsaugoti pateikėją, nors naršyklė negavo jo ID.
        setPerformerMode('existing')
        setAttempt((value) => value + 1)
        setError('Negautas pateikėjo kūrimo atsakymas. Patikrink atnaujintą pateikėjų sąrašą.')
      } else if (error instanceof TypeError) {
        setError('Negautas dainos kūrimo atsakymas. Prieš kartodamas patikrink „Mano“ dainų sąrašą.')
      } else {
        setError(error instanceof Error ? error.message : 'Dainos išsaugoti nepavyko.')
      }
    } finally {
      setSaving(false)
    }
  }

  const canSave = !saving && (
    createdPerformer !== null ||
    performerMode === 'new' ||
    (options.status === 'ready' && options.items.length > 0)
  )

  return (
    <dialog
      ref={dialog}
      aria-labelledby={headingId}
      onClose={onClose}
      onCancel={(event) => {
        if (saving) event.preventDefault()
      }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl
                 overflow-y-auto rounded-xl border border-line bg-surface p-5
                 text-ink backdrop:bg-black/60 md:p-7"
    >
      <h2 id={headingId} className="text-xl font-semibold">Nauja daina</h2>
      <p className="mt-2 text-sm text-muted">Daina bus išsaugota kaip juodraštis.</p>

      <form onSubmit={handleSubmit} className="mt-5">
        <fieldset disabled={saving} className="grid min-w-0 gap-4">
          <label className="grid gap-1">
            Dainos pavadinimas (privaloma)
            <input name="title" required maxLength={200} autoFocus className={fieldClass} />
          </label>

          <fieldset className="grid min-w-0 gap-2">
            <legend className="mb-2 font-medium">Pateikėjas (privaloma)</legend>

            {createdPerformer ? (
              <div className="grid gap-1">
                <p className="text-sm">
                  Pateikėjas <strong>{createdPerformer.name}</strong> jau išsaugotas.
                  Daina bus priskirta šiam pateikėjui.
                </p>
                <button
                  type="button"
                  className="cursor-pointer justify-self-start text-sm text-accent underline"
                  onClick={() => {
                    setCreatedPerformer(null)
                    setPerformerMode('existing')
                    setError('')
                    setOptions({ status: 'loading' })
                    setAttempt((value) => value + 1)
                  }}
                >
                  Pasirinkti kitą pateikėją
                </button>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  <label className="inline-flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="performerMode"
                      checked={performerMode === 'existing'}
                      onChange={() => {
                        setPerformerMode('existing')
                        setError('')
                      }}
                      className="accent-accent"
                    />
                    Pasirinkti esamą
                  </label>

                  <label className="inline-flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="performerMode"
                      checked={performerMode === 'new'}
                      onChange={() => {
                        setPerformerMode('new')
                        setError('')
                      }}
                      className="accent-accent"
                    />
                    Įvesti naują
                  </label>
                </div>

                {performerMode === 'new' ? (
                  <label className="grid gap-1">
                    Naujo pateikėjo vardas ir pavardė
                    <input
                      name="newPerformerName"
                      type="text"
                      required
                      maxLength={200}
                      className={fieldClass}
                    />
                  </label>
                ) : (
                  <>
                    <label className="grid gap-1">
                      Pasirink pateikėją
                      <select
                        name="performerId"
                        required
                        defaultValue=""
                        disabled={options.status !== 'ready' || options.items.length === 0}
                        className={fieldClass}
                      >
                        <option value="">
                          {options.status === 'loading' ? 'Įkeliami pateikėjai…' : 'Pasirink iš sąrašo'}
                        </option>
                        {options.status === 'ready' && options.items.map((person) => (
                          <option key={person.id} value={String(person.id)}>{person.name}</option>
                        ))}
                      </select>
                    </label>

                    {options.status === 'ready' && options.items.length === 0 && (
                      <p className="text-sm text-muted">
                        Pateikėjų dar nėra. Pasirink „Įvesti naują“.
                      </p>
                    )}

                    {options.status === 'error' && (
                      <div>
                        <p role="alert" className="text-sm">Nepavyko įkelti pateikėjų.</p>
                        <button
                          type="button"
                          className="mt-1 cursor-pointer text-sm underline"
                          onClick={() => {
                            setOptions({ status: 'loading' })
                            setAttempt((value) => value + 1)
                          }}
                        >
                          Bandyti dar kartą
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-[9rem_minmax(0,1fr)]">
            <label className="grid gap-1">
              Įrašymo metai
              <input
                name="recordingYear" type="number" min={1800} max={2100}
                step={1} className={fieldClass}
              />
            </label>
            <label className="grid gap-1">
              Įrašymo vieta
              <input name="recordingPlace" maxLength={200} className={fieldClass} />
            </label>
          </div>

          <label className="grid gap-1">
            Dainos tekstas
            <textarea name="lyrics" rows={4} className={`resize-y ${fieldClass}`} />
          </label>

          <label className="grid gap-1">
            Garso įrašo nuoroda
            <input name="audioUrl" type="url" className={fieldClass} />
          </label>

          <label className="grid gap-1">
            Nuoroda į archyvą
            <input name="externalArchiveUrl" type="url" className={fieldClass} />
          </label>

          {error && <p role="alert" className="text-sm">{error}</p>}

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className="min-h-11 cursor-pointer rounded-lg border border-field-border px-4 hover:bg-hover"
            >
              Atšaukti
            </button>
            <button type="submit" disabled={!canSave} className={primaryButton}>
              {saving ? 'Kuriama…' : 'Sukurti dainą'}
            </button>
          </div>
        </fieldset>
      </form>
    </dialog>
  )
}