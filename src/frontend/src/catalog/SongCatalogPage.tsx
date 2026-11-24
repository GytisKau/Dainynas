import { Link, useSearchParams } from 'react-router'
import { parseCatalogQuery, toCatalogParams } from './catalogQuery'
import Pagination from './Pagination'
import SongList from './SongList'
import SongSearchForm from './SongSearchForm'
import type { SongFilters, SongPage, SongSearch } from './types'
import { useCatalogResults } from './useCatalogResults'

export default function SongCatalogPage() {
  const [params, setParams] = useSearchParams()
  const parsed = parseCatalogQuery(params)

  if (!parsed.ok) {
    return (
      <main className="mx-auto w-full max-w-308 flex-1 px-4 py-6">
        <h1 className="text-2xl font-semibold text-ink">Dainų katalogas</h1>
        <p role="alert" className="mt-4 text-ink">
          Netinkama katalogo nuoroda. {parsed.message}
        </p>
        <Link to="/" className="mt-3 inline-block text-accent underline">
          Išvalyti parametrus ir atverti katalogą
        </Link>
      </main>
    )
  }

  return (
    <CatalogResults
      search={parsed.search}
      onNavigate={(next) => setParams(toCatalogParams(next))}
    />
  )
}


type CatalogResultsProps = {
  search: SongSearch
  onNavigate: (next: SongSearch) => void
}

function CatalogResults({ search, onNavigate }: CatalogResultsProps) {
  const query = toCatalogParams(search).toString()
  const url = query ? `/api/Songs?${query}` : '/api/Songs'
  const { catalog, showLoading, retry } = useCatalogResults<SongPage>(url)

  function handleSearch(filters: SongFilters) {
    const next = { ...search, ...filters, page: 1 }

    if (toCatalogParams(next).toString() === query) {
      retry()
      return
    }

    onNavigate(next)
  }

  function handlePageChange(page: number) {
    onNavigate({ ...search, page })
  }

  const { data, status } = catalog
  
  return (
    <main className="mx-auto w-full max-w-308 flex-1 px-4 pt-6 pb-8 md:pt-8">
      <h1 className="mb-4 text-2xl font-semibold text-accent md:text-3xl">
        Dainų katalogas
      </h1>

      <SongSearchForm
        initialFilters={{
          title: search.title,
          year: search.year,
          performerId: search.performerId,
        }}
        activeFilterCount={[search.year, search.performerId].filter(Boolean).length}
        onSearch={handleSearch}
      />

      <p role="status" className="my-3 min-h-6 text-sm text-muted">
        {status === 'error'
          ? catalog.message
          : showLoading
            ? data ? 'Atnaujinamas sąrašas…' : 'Įkeliamos dainos…'
            : data
              ? Number(data.totalItems) === 0
                ? 'Dainų pagal šią paiešką nerasta.'
                : `Rasta dainų: ${data.totalItems}`
              : ''}
      </p>

      {data && data.items.length > 0 && (
        <SongList songs={data.items} loading={status === 'loading'} />
      )}

      {data && (
        <Pagination
          page={Number(data.page)}
          totalPages={Number(data.totalPages)}
          onPageChange={handlePageChange}
        />
      )}
    </main>
  )
}
