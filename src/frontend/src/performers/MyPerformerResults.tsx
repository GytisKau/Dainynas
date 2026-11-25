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

  const { data, status } = catalog

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

                <PerformerDialog
                  token={token}
                  performer={performer}
                  onSaved={retry}
                />
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
    </>
  )
}