import { useRef, useState } from 'react'
import Pagination from '../catalog/Pagination'
import { useCatalogResults } from '../catalog/useCatalogResults'
import PerformerDialog, { type EditablePerformer } from './PerformerDialog'

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

export default function MyPerformerResults({
  token,
  page,
  onPageChange,
  revision,
}: MyPerformerResultsProps) {
  const { catalog, showLoading, retry } = useCatalogResults<MyPerformersData>(
    `/api/Performers/mine?page=${page}&pageSize=10`,
    token,
    revision,
  )

  const deleteDialog = useRef<HTMLDialogElement>(null)
  const [selected, setSelected] = useState<EditablePerformer | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [notice, setNotice] = useState('')

  function confirmDelete(performer: EditablePerformer) {
    setSelected(performer)
    setDeleteError('')
    setNotice('')
    deleteDialog.current?.showModal()
  }

  const { data, status } = catalog

  async function deletePerformer() {
    if (!selected || deleting) return

    setDeleting(true)
    setDeleteError('')

    try {
      const response = await fetch(
        `/api/Performers/${encodeURIComponent(String(selected.id))}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        },
      )

      if (response.status === 204) {
        setNotice(`Pateikėjas „${selected.name}“ pašalintas.`)
        deleteDialog.current?.close()

        // Pašalinus vienintelę paskutinio puslapio eilutę,
        // grįžtame į artimiausią likusį puslapį.
        if (data && Number(data.page) === Number(data.totalPages)
            && data.items.length === 1 && Number(data.page) > 1) {
          onPageChange(Number(data.page) - 1)
        } else {
          retry()
        }

        return
      }

      if (response.status === 404) {
        setNotice('Šio pateikėjo jau nebėra. Sąrašas atnaujintas.')
        deleteDialog.current?.close()
        if (page > 1 && data?.items.length === 1) {
          onPageChange(page - 1)
        } else {
          retry()
        }
        return
      }

      const problem = await response.json().catch(() => null)
      const messages: Record<number, string> = {
        401: 'Sesija nebegalioja. Prisijunk iš naujo.',
        403: 'Neturi teisės pašalinti šio pateikėjo.',
        409: 'Šio pateikėjo dabar pašalinti negalima.',
      }

      setDeleteError(
        problem?.detail ||
        messages[response.status] ||
        `Pateikėjo pašalinti nepavyko (HTTP ${response.status}).`,
      )
    } catch {
      setDeleteError(
        'Nepavyko gauti serverio atsakymo. Prieš kartodamas veiksmą atnaujink sąrašą.',
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
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0 wrap-anywhere">
                  <p className="text-xs font-medium text-accent">
                    {performer.publicationStatus}
                  </p>
                  <p className="font-semibold">{performer.name}</p>
                  {performer.residence && (
                    <p className="text-muted">{performer.residence}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <PerformerDialog token={token} performer={performer} onSaved={retry} />
                  
                  <button
                    type="button"
                    disabled={status === 'loading'}
                    aria-label={`Pašalinti pateikėją ${performer.name}`}
                    onClick={() => confirmDelete(performer)}
                    className="min-h-11 rounded-lg px-3 text-sm font-medium text-ink
                              hover:bg-hover disabled:opacity-60"
                  >
                    Pašalinti
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <Pagination
            page={Number(data.page)}
            totalPages={Number(data.totalPages)}
            onPageChange={onPageChange}
          />

          <p role="status" className="mt-3 text-sm text-muted">
            {notice}
          </p>

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
      )}
    </>
  )
}