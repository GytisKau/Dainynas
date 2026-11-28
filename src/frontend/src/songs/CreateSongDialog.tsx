import { useEffect, useId, useRef, useState, type SubmitEvent } from 'react'
import { loadPerformerOptions } from '../performers/loadPerformerOptions'
import type { PerformerOption } from '../performers/types'
import { useToast } from '../components/useToast'
import type { SongDetails } from './types'

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
          onSaved={onCreated}
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

type SongFormProps = {
  token: string
  song?: SongDetails
  onSaved: () => void
  onClose: () => void
}

export function SongFormDialog({ token, song, onSaved, onClose }: SongFormProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const headingId = useId()
  const notify = useToast()
  const [options, setOptions] = useState<OptionsState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [performerMode, setPerformerMode] = useState<'existing' | 'new'>('existing')
  const [createdPerformer, setCreatedPerformer] = useState<PerformerOption | null>(null)

  const proposing = song?.publicationStatus === 'Published'
  const [selectedPerformerId, setSelectedPerformerId] = useState(
    song ? String(song.performerId) : '',
  )

  const heading = proposing ? 'Siūlyti dainos pakeitimus' : song ? 'Redaguoti dainą' : 'Nauja daina'
  const submitLabel = proposing ? 'Pateikti pakeitimus' : song ? 'Išsaugoti pakeitimus' : 'Sukurti dainą'

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
          proposing
            ? Promise.resolve([])
            : loadPerformerOptions('mine', controller.signal, token),
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
  }, [token, attempt, proposing])

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

    const update = song?.links.update

    if (song && !update) {
      setError('Šios dainos dabar redaguoti negalima.')
      return
    }

    if (
      performerMode === 'existing' &&
      !createdPerformer &&
      (options.status !== 'ready' ||
        !options.items.some((person) => String(person.id) === String(performerId)))
    ) {
      setError('Pasirink pasiekiamą pateikėją iš sąrašo.')
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

      const response = await fetch(update?.href ?? '/api/Songs', {
        method: song ? 'PUT' : 'POST',
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

      const saved = song
        ? response.status === 204 || response.status === 202
        : response.status === 201

      if (!saved) {
        switch (response.status) {
          case 400:
            throw new Error('Patikrink dainos laukus ir pasirinktą pateikėją.')
          case 401:
            throw new Error('Sesija baigėsi. Prisijunk iš naujo.')
          case 403:
            throw new Error('Neturi teisės redaguoti šios dainos.')
          case 404:
            throw new Error('Daina arba pasirinktas pateikėjas nebepasiekiamas.')
          case 409: {
            const problem = await response.json().catch(() => null)
            const reasons: Record<string, string> = {
              'Song is awaiting moderation.': 'Daina jau laukia moderatoriaus sprendimo.',
              'A public song requires a published performer.':
                'Paskelbtai dainai pasirink paskelbtą pateikėją.',
              'A moderation request already exists.':
                'Šios dainos pakeitimai jau pateikti moderatoriui.',
            }
            throw new Error(reasons[problem?.message] ?? 'Dainos būsena pasikeitė. Atnaujink puslapį.')
          }
          default:
            throw new Error(`Dainos išsaugoti nepavyko (HTTP ${response.status}).`)
        }
      }

      dialog.current?.close()

      if (response.status === 202) {
        notify('success', 'Dainos pakeitimai pateikti moderatoriui.')
      } else {
        notify('success', song
          ? `Daina „${title}“ atnaujinta.`
          : `Daina „${title}“ išsaugota kaip juodraštis.`)
      }

      onSaved()
    } catch (error) {
      if (error instanceof TypeError && !performerId) {
        // Serveris galėjo išsaugoti pateikėją, nors naršyklė negavo jo ID.
        setPerformerMode('existing')
        setAttempt((value) => value + 1)
        setError('Negautas pateikėjo kūrimo atsakymas. Patikrink atnaujintą pateikėjų sąrašą.')
      } else if (error instanceof TypeError) {
        setError('Negautas dainos išsaugojimo atsakymas. Prieš kartodamas patikrink dainos būseną.')
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
      <h2 id={headingId} className="text-xl font-semibold">{heading}</h2>

      {proposing && (
        <p className="mt-2 text-sm text-muted">
          Pakeitimai taps vieši, kai juos patvirtins moderatorius.
        </p>
      )}

      {!song && (
        <p className="mt-2 text-sm text-muted">Daina bus išsaugota kaip juodraštis.</p>
      )}

      <form onSubmit={handleSubmit} className="mt-5">
        <fieldset disabled={saving} className="grid min-w-0 gap-4">
          <label className="grid gap-1">
            Dainos pavadinimas (privaloma)
            <input name="title" required maxLength={200} autoFocus defaultValue={song?.title ?? ''} className={fieldClass} />
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
                {!proposing && (
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
                )}

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
                        value={selectedPerformerId}
                        onChange={(event) => setSelectedPerformerId(event.currentTarget.value)}                        
                        disabled={options.status !== 'ready' || options.items.length === 0}
                        className={fieldClass}
                      >
                        <option value="">
                          {options.status === 'loading' ? 'Įkeliami pateikėjai…' : 'Pasirink iš sąrašo'}
                        </option>
                        {song && options.status === 'ready' &&
                          !options.items.some((person) => String(person.id) === String(song.performerId)) && (
                            <option value={String(song.performerId)} disabled>
                              {song.performerName} (nepasiekiamas – pasirink kitą)
                            </option>
                          )
                        }
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
                step={1} defaultValue={song?.recordingYear ?? ''} className={fieldClass}
              />
            </label>
            <label className="grid gap-1">
              Įrašymo vieta
              <input name="recordingPlace" maxLength={200} defaultValue={song?.recordingPlace ?? ''} className={fieldClass} />
            </label>
          </div>

          <label className="grid gap-1">
            Dainos tekstas
            <textarea name="lyrics" rows={4} defaultValue={song?.lyrics ?? ''} className={`resize-y ${fieldClass}`} />
          </label>

          <label className="grid gap-1">
            Garso įrašo nuoroda
            <input name="audioUrl" type="url" defaultValue={song?.audioUrl ?? ''} className={fieldClass} />
          </label>

          <label className="grid gap-1">
            Nuoroda į archyvą
            <input name="externalArchiveUrl" type="url" defaultValue={song?.externalArchiveUrl ?? ''} className={fieldClass} />
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
              {saving ? 'Siunčiama…' : submitLabel}
            </button>
          </div>
        </fieldset>
      </form>
    </dialog>
  )
}