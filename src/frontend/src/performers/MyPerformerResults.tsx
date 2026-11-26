import { useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useCatalogResults } from '../catalog/useCatalogResults'
import { removePerformer } from './performerApi'
import { useToast } from '../components/useToast'
import Pagination from '../catalog/Pagination'
import PerformerDialog, { type EditablePerformer } from './PerformerDialog'
import PerformerRowActions from './PerformerRowActions'

type MyPerformersData = {
  items: EditablePerformer[]
  page: number | string
  totalItems: number | string
  totalPages: number | string
}

type MyPerformerResultsProps = {
  token: string
  page: number
  onPageChange: (page: number) => void
  revision: number
}

const publicationLabels: Record<string, string> = {
  Draft: 'Juodraštis',
  Pending: 'Laukia peržiūros',
  Published: 'Paskelbtas',
}

export default function MyPerformerResults({
  token,
  page,
  onPageChange,
  revision,
}: MyPerformerResultsProps) {
  const location = useLocation()
  const { catalog, showLoading, retry } = useCatalogResults<MyPerformersData>(
    `/api/Performers/mine?page=${page}&pageSize=10`,
    token,
    revision,
  )

  const deleteDialog = useRef<HTMLDialogElement>(null)
  const [selected, setSelected] = useState<EditablePerformer | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const notify = useToast()

  function confirmDelete(performer: EditablePerformer) {
    setSelected(performer)
    setDeleteError('')
    deleteDialog.current?.showModal()
  }

  const { data, status } = catalog

  async function deletePerformer() {
    if (!selected || deleting) return

    setDeleting(true)
    setDeleteError('')

    try {
      const result = await removePerformer(selected.id, token)

      deleteDialog.current?.close()

      notify(
        'success',
        result === 'deleted'
          ? `Pateikėjas „${selected.name}“ pašalintas.`
          : 'Šio pateikėjo sąraše jau nebėra.',
      )

      // Jei rodyta vienintelė eilutė dingo, grįžtame į galiojantį puslapį.
      const lastRow = data?.items.length === 1
      const lastPage = data && Number(data.page) === Number(data.totalPages)

      if (page > 1 && lastRow && (lastPage || result === 'already-missing')) {
        onPageChange(page - 1)
      } else {
        retry()
      }
    } catch (error) {
      setDeleteError(
        error instanceof TypeError
          ? 'Nepavyko gauti serverio atsakymo. Prieš kartodamas veiksmą atnaujink sąrašą.'
          : error instanceof Error
            ? error.message
            : 'Pateikėjo pašalinti nepavyko.',
      )
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      {status === 'error' ? (
        <div className="my-3">
          <p role="alert">{catalog.message}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-2 text-accent underline"
          >
            Bandyti dar kartą
          </button>
        </div>
      ) : (
        <p role="status" className="my-3 min-h-6 text-sm text-muted">
          {showLoading
            ? 'Įkeliami pateikėjai…'
            : data && Number(data.totalItems) === 0
              ? 'Dar nesukūrei nė vieno pateikėjo.'
              : data && `Tavo pateikėjų: ${data.totalItems}`}
        </p>
      )}

      {data && data.items.length > 0 && (
        <>
          <ul
            aria-busy={status === 'loading'}
            className="divide-y divide-line rounded-xl border border-line bg-surface"
          >
            {data.items.map((performer) => (
              <li
                key={performer.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center"
              >
                <Link
                  to={`/pateikejai/${performer.id}`}
                  state={{ catalogSearch: location.search }}
                  className="grid min-w-0 self-stretch content-center gap-0.5
                            rounded-lg px-4 py-3 wrap-anywhere transition-colors
                            hover:bg-hover focus-visible:bg-hover focus-visible:-outline-offset-2"
                >
                  <span className="text-xs font-medium text-accent">
                    {publicationLabels[performer.publicationStatus] ?? performer.publicationStatus}
                  </span>

                  <span className="font-semibold text-ink">{performer.name}</span>

                  {performer.residence && (
                    <span className="text-muted">{performer.residence}</span>
                  )}
                </Link>

                <div className="pr-2">
                  <PerformerDialog
                    token={token}
                    performer={performer}
                    onSaved={retry}
                    renderTrigger={(openEdit) => (
                      <PerformerRowActions
                        performer={performer}
                        token={token}
                        disabled={status === 'loading'}
                        onEdit={openEdit}
                        onDelete={() => confirmDelete(performer)}
                        onChanged={retry}
                      />
                    )}
                  />
                </div>
              </li>
            ))}
          </ul>

          <Pagination
            page={Number(data.page)}
            totalPages={Number(data.totalPages)}
            onPageChange={onPageChange}
          />
        </>
      )}

      <dialog
        ref={deleteDialog}
        aria-labelledby="delete-performer-title"
        aria-describedby="delete-performer-description"
        onCancel={(event) => {
          if (deleting) event.preventDefault()
        }}
        onClose={() => setSelected(null)}
        className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-xl
                  border border-line bg-surface p-5 text-ink backdrop:bg-black/60 md:p-7"
      >
        <h2 id="delete-performer-title" className="text-xl font-semibold">
          Pašalinti pateikėją?
        </h2>

        <p id="delete-performer-description" className="mt-3 wrap-anywhere">
          Ar pašalinti pateikėją „{selected?.name}“?
        </p>

        {deleteError && <p role="alert" className="mt-3 text-sm">{deleteError}</p>}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            autoFocus
            disabled={deleting}
            onClick={() => deleteDialog.current?.close()}
            className="min-h-11 rounded-lg border border-field-border px-4 hover:bg-hover"
          >
            Atšaukti
          </button>

          <button
            type="button"
            disabled={deleting}
            onClick={deletePerformer}
            className="min-h-11 rounded-lg bg-red-700 px-4 font-semibold text-white
                      hover:bg-red-800 disabled:opacity-60"
          >
            {deleting ? 'Šalinama…' : 'Pašalinti'}
          </button>
        </div>
      </dialog>
    </>
  )
}