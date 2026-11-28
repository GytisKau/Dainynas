import { Link, useLocation, useSearchParams } from 'react-router'
import CatalogViewNavigation from '../components/CatalogViewNavigation'
import { readSongCatalogQuery, toCatalogParams } from './catalogQuery'
import Pagination from './Pagination'
import SongList from './SongList'
import SongSearchForm from './SongSearchForm'
import type { SongFilters, SongPage, SongSearch } from './types'
import { useCatalogResults } from './useCatalogResults'

export default function SongCatalogPage({ token }: { token?: string }) {
  const [params, setParams] = useSearchParams()
  const parsed = readSongCatalogQuery(params)

  function navigate(next: SongSearch) {
    const nextParams = toCatalogParams(next)
    if (parsed.ok && parsed.mine) nextParams.set('rodinys', 'mano')
    setParams(nextParams)
  }

  return (
    <main className="mx-auto w-full max-w-308 flex-1 px-4 pt-6 pb-8 md:pt-8">
      <h1 className="mb-4 text-2xl font-semibold text-accent md:text-3xl">
        Dainų katalogas
      </h1>

      {!parsed.ok ? (
        <>
          <p role="alert">Netinkama katalogo nuoroda. {parsed.message}</p>
          <Link to="/" className="mt-3 inline-block text-accent underline">
            Atverti viešų dainų katalogą
          </Link>
        </>
      ) : (
        <>
          {token && (
            <CatalogViewNavigation
              path="/"
              view={parsed.mine ? 'mine' : 'public'}
              publicLabel="Viešos"
            />
          )}

          {parsed.mine && !token ? (
            <p className="text-muted">
              Kad matytum savo dainas,{' '}
              <Link to="/prisijungti" className="text-ink underline underline-offset-4">
                prisijunk
              </Link>
              .
            </p>
          ) : (
            <CatalogResults
              key={parsed.mine ? 'mine' : 'public'}
              mine={parsed.mine}
              token={parsed.mine ? token : undefined}
              search={parsed.search}
              onNavigate={navigate}
            />
          )}
        </>
      )}
    </main>
  )
}

type ResultsProps = {
  mine: boolean
  token?: string
  search: SongSearch
  onNavigate: (next: SongSearch) => void
}

function CatalogResults({ mine, token, search, onNavigate }: ResultsProps) {
  const location = useLocation()
  const query = toCatalogParams(search).toString()
  const endpoint = mine ? '/api/Songs/mine' : '/api/Songs'
  const url = query ? `${endpoint}?${query}` : endpoint

  const { catalog, showLoading, retry } = useCatalogResults<SongPage>(url, token)
  const { data, status } = catalog

  function handleSearch(filters: SongFilters) {
    const next = { ...search, ...filters, page: 1 }

    if (toCatalogParams(next).toString() === query) {
      retry()
    } else {
      onNavigate(next)
    }
  }

  let statusText = ''

  if (showLoading) {
    statusText = data ? 'Atnaujinamas sąrašas…' : 'Įkeliamos dainos…'
  } else if (data?.items.length) {
    statusText = mine
      ? `Tavo dainų: ${data.totalItems}`
      : `Rasta dainų: ${data.totalItems}`
  } else if (data && Number(data.page) > 1) {
    statusText = 'Šiame puslapyje dainų nėra.'
  } else if (data) {
    statusText = mine ? 'Dar nesukūrei nė vienos dainos.' : 'Dainų pagal šią paiešką nerasta.'
  }

  return (
    <>
      {!mine && (
        <SongSearchForm
          initialFilters={{
            title: search.title,
            year: search.year,
            performerId: search.performerId,
          }}
          activeFilterCount={[search.year, search.performerId].filter(Boolean).length}
          onSearch={handleSearch}
        />
      )}

      {status === 'error' ? (
        <div className="my-3">
          <p role="alert">{catalog.message}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-2 cursor-pointer text-accent underline"
          >
            Bandyti dar kartą
          </button>
        </div>
      ) : (
        <p role="status" className="my-3 min-h-6 text-sm text-muted">
          {statusText}
        </p>
      )}

      {data && data.items.length > 0 && (
        <SongList
          songs={data.items}
          loading={status === 'loading'}
          catalogSearch={location.search}
        />
      )}

      {data && (
        <Pagination
          page={Number(data.page)}
          totalPages={Number(data.totalPages)}
          onPageChange={(page) => onNavigate({ ...search, page })}
        />
      )}

      {data && data.items.length === 0 && Number(data.page) > 1 && (
        <button
          type="button"
          onClick={() => onNavigate({ ...search, page: 1 })}
          className="cursor-pointer text-accent underline"
        >
          Grįžti į pirmą puslapį
        </button>
      )}
    </>
  )
}