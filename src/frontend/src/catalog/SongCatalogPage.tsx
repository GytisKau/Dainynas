import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { parseCatalogQuery, toCatalogParams } from './catalogQuery'
import Pagination from './Pagination'
import SongList from './SongList'
import SongSearchForm from './SongSearchForm'
import type { SongFilters, SongPage, SongSearch } from './types'

type CatalogState = {
  status: 'loading' | 'ready' | 'error'
  data: SongPage | null
  message?: string
}

export default function SongCatalogPage() {
  const [params, setParams] = useSearchParams()
  const parsed = parseCatalogQuery(params)

  if (!parsed.ok) {
    return (
      <main className="mx-auto w-full max-w-[77rem] flex-1 px-4 py-6">
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
  const [catalog, setCatalog] = useState<CatalogState>({
    status: 'loading',
    data: null,
  })
  const [showLoading, setShowLoading] = useState(false)

  const query = toCatalogParams(search).toString()
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    setShowLoading(false)
    setCatalog((previous) => ({
      status: 'loading',
      data: previous.data,
    }))

    const timer = window.setTimeout(() => setShowLoading(true), 250)

    async function loadSongs() {
      try {
        const url = query ? `/api/Songs?${query}` : '/api/Songs'
        const response = await fetch(url, {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(await readCatalogError(response))
        }

        const data: SongPage = await response.json()

        if (!controller.signal.aborted) {
          setCatalog({ status: 'ready', data })
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setCatalog({
            status: 'error',
            data: null,
            message: error instanceof Error
              ? error.message
              : 'Nepavyko įkelti dainų.',
          })
        }
      } finally {
        window.clearTimeout(timer)
        if (!controller.signal.aborted) setShowLoading(false)
      }
    }

    void loadSongs()

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [query, attempt])

  function handleSearch(filters: SongFilters) {
    const next = { ...search, ...filters, page: 1 }

    if (toCatalogParams(next).toString() === query) {
      setAttempt((previous) => previous + 1)
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
        key={JSON.stringify([search.title, search.year, search.performerId])}
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

async function readCatalogError(response: Response): Promise<string> {
  if (response.status !== 400) {
    return `Nepavyko įkelti dainų (HTTP ${response.status}).`
  }

  const fallback = 'Serveris atmetė paieškos parametrus. Patikrink filtrus.'

  try {
    const problem = await response.json()

    if (typeof problem?.detail === 'string' && problem.detail.trim()) {
      return problem.detail
    }

    if (typeof problem?.title === 'string' && problem.title.trim()) {
      return problem.title
    }
  } catch {
    // Atsakymas gali būti tuščias arba neturėti JSON turinio.
  }

  return fallback
}