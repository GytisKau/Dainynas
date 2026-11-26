import type { SubmitEvent } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import Pagination from '../catalog/Pagination'
import { parseCatalogQuery, toCatalogParams } from '../catalog/catalogQuery'
import type { SongSearch } from '../catalog/types'
import { useCatalogResults } from '../catalog/useCatalogResults'
import type { AlbumPageData } from './types'
import CatalogViewNavigation from '../components/CatalogViewNavigation'

const publicKeys = new Set(['title', 'page', 'pageSize'])
const mineKeys = new Set(['page', 'pageSize'])

function readAlbumQuery(params: URLSearchParams) {
  const views = params.getAll('rodinys')

  if (views.length > 1) {
    return { ok: false, message: 'Parametras „rodinys“ nuorodoje pakartotas.' } as const
  }

  if (views.length === 1 && views[0] !== 'mano') {
    return { ok: false, message: 'Nežinomas albumų katalogo rodinys.' } as const
  }

  const mine = views[0] === 'mano'
  const filters = new URLSearchParams(params)
  filters.delete('rodinys')

  if (mine && filters.has('title')) {
    return {
      ok: false,
      message: 'Paieška pagal pavadinimą galima viešame albumų kataloge.',
    } as const
  }

  const parsed = parseCatalogQuery(filters, mine ? mineKeys : publicKeys)
  if (!parsed.ok) return parsed

  return { ok: true, mine, search: parsed.search } as const
}

export default function AlbumCatalogPage({ token }: { token?: string }) {
  const [params, setParams] = useSearchParams()
  const parsed = readAlbumQuery(params)

  function navigate(search: SongSearch) {
    const next = toCatalogParams(search)
    if (parsed.ok && parsed.mine) next.set('rodinys', 'mano')
    setParams(next)
  }

  return (
    <main className="mx-auto w-full max-w-308 flex-1 px-4 pt-6 pb-8 md:pt-8">
      <h1 className="mb-4 text-2xl font-semibold text-accent md:text-3xl">
        Albumų katalogas
      </h1>

      {!parsed.ok ? (
        <>
          <p role="alert">{parsed.message}</p>
          <Link to="/albumai" className="mt-3 inline-block text-accent underline">
            Išvalyti parametrus
          </Link>
        </>
      ) : (
        <>
          {token && (
            <CatalogViewNavigation
              path="/albumai"
              view={parsed.mine ? 'mine' : 'public'}
            />
          )}

          {parsed.mine && !token ? (
            <p className="text-muted">
              Kad matytum savo albumus,{' '}
              <Link to="/prisijungti" className="text-ink underline underline-offset-4">
                prisijunk
              </Link>
              .
            </p>
          ) : (
            <AlbumResults
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

function AlbumResults({ mine, token, search, onNavigate }: ResultsProps) {
  const location = useLocation()
  const query = toCatalogParams(search).toString()
  const endpoint = mine ? '/api/Albums/mine' : '/api/Albums'
  const url = query ? `${endpoint}?${query}` : endpoint

  const { catalog, showLoading, retry } = useCatalogResults<AlbumPageData>(url, token)
  const { data, status } = catalog

  function handleSearch(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = new FormData(event.currentTarget)
    const title = String(form.get('title') ?? '').trim()
    const next = { ...search, title, page: 1 }

    if (toCatalogParams(next).toString() === query) {
      retry()
    } else {
      onNavigate(next)
    }
  }

  let statusText = ''

  if (showLoading) {
    statusText = data ? 'Atnaujinamas sąrašas…' : 'Įkeliami albumai…'
  } else if (data?.items.length) {
    statusText = mine
      ? `Tavo albumų: ${data.totalItems}`
      : `Rasta albumų: ${data.totalItems}`
  } else if (data && Number(data.page) > 1) {
    statusText = 'Šiame puslapyje albumų nėra.'
  } else if (data) {
    statusText = mine
      ? 'Dar nesukūrei nė vieno albumo.'
      : 'Albumų pagal šią paiešką nerasta.'
  }

  return (
    <>
      {!mine && (
        <form
          onSubmit={handleSearch}
          className="grid max-full grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-1"
        >
          <label htmlFor="album-title" className="col-span-2">
            Albumo pavadinimas
          </label>
          <input
            key={search.title}
            id="album-title"
            name="title"
            type="search"
            defaultValue={search.title}
            className="min-h-11 min-w-0 rounded-lg border border-field-border bg-field px-3"
          />
          <button
            type="submit"
            className="min-h-11 rounded-lg bg-accent px-4 font-semibold text-on-accent transition-colors hover:bg-accent-hover"
          >
            Ieškoti
          </button>
        </form>
      )}

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
          {statusText}
        </p>
      )}

      {data && data.items.length > 0 && (
        <>
          <ul
            aria-busy={status === 'loading'}
            className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface"
          >
            {data.items.map((album) => (
              <li key={album.id}>
                <Link
                  to={`/albumai/${album.id}`}
                  state={{ catalogSearch: location.search }}
                  className="grid gap-0.5 px-4 py-3 wrap-anywhere transition-colors hover:bg-hover focus-visible:bg-hover focus-visible:-outline-offset-2"
                >
                  <span className="text-xs font-medium text-accent">
                    Dainų: {album.songs.length}
                  </span>
                  <span className="font-semibold text-ink">{album.title}</span>
                  {album.description && (
                    <span className="line-clamp-2 text-muted">
                      {album.description}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>

          <Pagination
            page={Number(data.page)}
            totalPages={Number(data.totalPages)}
            onPageChange={(page) => onNavigate({ ...search, page })}
          />
        </>
      )}

      {data && data.items.length === 0 && Number(data.page) > 1 && (
        <button
          type="button"
          onClick={() => onNavigate({ ...search, page: 1 })}
          className="text-accent underline"
        >
          Grįžti į pirmą puslapį
        </button>
      )}
    </>
  )
}