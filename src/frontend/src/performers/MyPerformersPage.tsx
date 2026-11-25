import { useState } from 'react'
import Pagination from '../catalog/Pagination'
import { useCatalogResults } from '../catalog/useCatalogResults'
import PerformerDialog, { type EditablePerformer } from './PerformerDialog'

type MyPerformersData = {
  items: EditablePerformer[]
  page: number | string
  totalItems: number | string
  totalPages: number | string
}

export default function MyPerformersPage({ token }: { token: string }) {
  const [page, setPage] = useState(1)
  const { catalog, showLoading, retry } = useCatalogResults<MyPerformersData>(
    `/api/Performers/mine?page=${page}&pageSize=10`,
    token,
  )

  const { data, status } = catalog

  return (
    <main className="mx-auto w-full max-w-308 flex-1 px-4 pt-6 pb-8 md:pt-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-accent md:text-3xl">
          Mano pateikėjai
        </h1>
        <PerformerDialog token={token} onSaved={retry} />
      </div>

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
            onPageChange={setPage}
          />
        </>
      )}
    </main>
  )
}