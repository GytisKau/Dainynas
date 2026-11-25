import { Link, useLocation } from 'react-router'
import Pagination from '../catalog/Pagination'
import { useCatalogResults } from '../catalog/useCatalogResults'
import type { PerformerDetails } from '../songs/types'
import type { Search } from './performerQuery'

type PerformerItem = PerformerDetails & {
  id: number | string
}

type PerformerPage = {
  items: PerformerItem[]
  page: number | string
  totalItems: number | string
  totalPages: number | string
}

type ResultsProps = {
  search: Search
  onPageChange: (page: number) => void
}

export default function PublicPerformerResults({ search, onPageChange }: ResultsProps) {
  const location = useLocation()

  const params = new URLSearchParams({
    page: String(search.page),
    pageSize: '10',
  })
  if (search.name) params.set('name', search.name)

  const { catalog, showLoading, retry } = useCatalogResults<PerformerPage>(
    `/api/Performers?${params}`,
  )

  if (catalog.status === 'error') {
    return (
      <div className="my-4">
        <p role="alert">{catalog.message}</p>
        <button
          type="button"
          onClick={retry}
          className="mt-2 text-accent underline underline-offset-4"
        >
          Bandyti dar kartą
        </button>
      </div>
    )
  }

  if (!catalog.data) {
    return (
      <p role="status" className="my-3 min-h-6 text-sm text-muted">
        {showLoading ? 'Įkeliami pateikėjai…' : ''}
      </p>
    )
  }

  const { items, page, totalItems, totalPages } = catalog.data

  if (items.length === 0) {
    const isLaterPage = Number(page) > 1
    const emptyMessage = isLaterPage
      ? 'Šiame puslapyje pateikėjų nėra.'
      : 'Pateikėjų pagal šią paiešką nerasta.'

    return (
      <div className="my-3">
        <p role="status" className="min-h-6 text-sm text-muted">
          {showLoading ? 'Atnaujinamas sąrašas…' : emptyMessage}
        </p>
        {isLaterPage && (
          <button
            type="button"
            onClick={() => onPageChange(1)}
            className="mt-2 text-accent underline underline-offset-4"
          >
            Grįžti į pirmą puslapį
          </button>
        )}
      </div>
    )
  }

  return (
    <>
      <p role="status" className="my-3 min-h-6 text-sm text-muted">
        {showLoading ? 'Atnaujinamas sąrašas…' : `Rasta pateikėjų: ${totalItems}`}
      </p>

      <ul
        aria-busy={catalog.status === 'loading'}
        className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface"
      >
        {items.map((performer) => (
          <li key={performer.id}>
            <Link
              to={`/pateikejai/${performer.id}`}
              state={{catalogSearch: location.search}}
              className="grid gap-0.5 px-4 py-3 wrap-anywhere transition-colors hover:bg-hover focus-visible:bg-hover focus-visible:-outline-offset-2"
            >
              {performer.residence && (
                <span className="text-xs font-medium text-accent uppercase">
                  {performer.residence}
                </span>
              )}

              <span className="font-semibold text-ink">{performer.name}</span>

              {performer.birthYear != null && (
                <span className="text-muted">
                  Gimimo metai: {performer.birthYear}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>

      <Pagination
        page={Number(page)}
        totalPages={Number(totalPages)}
        onPageChange={onPageChange}
      />
    </>
  )
}