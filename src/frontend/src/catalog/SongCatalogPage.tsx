import { useEffect, useState } from 'react'
import Pagination from './Pagination'
import SongList from './SongList'
import SongSearchForm from './SongSearchForm'
import {
  emptyFilters,
  type SongFilters,
  type SongPage,
  type SongSearch,
} from './types'

type CatalogState = {
  status: 'loading' | 'ready' | 'error'
  data: SongPage | null
}

export default function SongCatalogPage() {
  const [search, setSearch] = useState<SongSearch>({ 
    ...emptyFilters, page: 1 
  })
  const [catalog, setCatalog] = useState<CatalogState>({
    status: 'loading',
    data: null,
  })
  const [showLoading, setShowLoading] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => setShowLoading(true), 250)

    async function loadSongs() {
      const params = new URLSearchParams({
        page: String(search.page),
        pageSize: '5',
      })

      if (search.title) params.set('title', search.title)
      if (search.year) params.set('year', search.year)
      if (search.performerId) params.set('performerId', search.performerId)


      try {
        const response = await fetch(`/api/Songs?${params}`, {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        })

        if (!response.ok) throw new Error(`HTTP ${response.status}`)

        const data: SongPage = await response.json()

        if (!controller.signal.aborted) {
          setCatalog({ status: 'ready', data })
        }
      } catch {
        if (!controller.signal.aborted) {
          setCatalog((previous) => ({ ...previous, status: 'error' }))
        }
      } finally {
        window.clearTimeout(timer)

        if (!controller.signal.aborted) {
          setShowLoading(false)
        }
      }
    }

    void loadSongs()

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [search])

  function handleSearch(filters: SongFilters) {
    setShowLoading(false)
    setCatalog((previous) => ({ ...previous, status: 'loading' }))
    setSearch({ ...filters, page: 1 })
  }

  function handlePageChange(page: number) {
    setShowLoading(false)
    setCatalog((previous) => ({ ...previous, status: 'loading' }))
    setSearch((previous) => ({ ...previous, page }))
  }

  const { data, status } = catalog
  
  return (
    <main className="mx-auto w-full max-w-308 flex-1 px-4 pt-6 pb-8 md:pt-8">
      <h1 className="mb-4 text-2xl font-semibold text-accent md:text-3xl">
        Dainų katalogas
      </h1>

      <SongSearchForm
        activeFilterCount={[search.year, search.performerId].filter(Boolean).length}
        onSearch={handleSearch}
      />

      <p role="status" className="my-3 min-h-6 text-sm text-muted">
        {status === 'error'
          ? data
            ? 'Atnaujinti nepavyko. Rodomi ankstesni rezultatai.'
            : 'Dainų įkelti nepavyko. Bandyk dar kartą.'
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