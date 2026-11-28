import { useState, type SubmitEvent } from 'react'
import CreateAlbumDialog from './CreateAlbumDialog'
import { Link, useLocation, useSearchParams } from 'react-router'
import Pagination from '../catalog/Pagination'
import { parseCatalogQuery, toCatalogParams } from '../catalog/catalogQuery'
import type { SongSearch } from '../catalog/types'
import { useCatalogResults } from '../catalog/useCatalogResults'
import type { Album, AlbumPageData } from './types'
import CatalogViewNavigation from '../components/CatalogViewNavigation'
import AlbumStatus from './AlbumStatus'
import { useAlbumPublication } from './useAlbumPublication'
import AlbumActions from './AlbumActions'

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
  const [revision, setRevision] = useState(0)

  function handleCreated() {
    if (parsed.ok && parsed.mine && parsed.search.page === 1) {
      setRevision((previous) => previous + 1)
      return
    }

    const next = new URLSearchParams({ rodinys: 'mano' })

    if (parsed.ok && parsed.search.pageSize !== 10) {
      next.set('pageSize', String(parsed.search.pageSize))
    }

    setParams(next)
  }

  function navigate(search: SongSearch) {
    const next = toCatalogParams(search)
    if (parsed.ok && parsed.mine) next.set('rodinys', 'mano')
    setParams(next)
  }

  return (
    <main className="mx-auto w-full max-w-308 flex-1 px-4 pt-6 pb-8 md:pt-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-accent md:text-3xl">
          Albumų katalogas
        </h1>

        {token && <CreateAlbumDialog token={token} onCreated={handleCreated} />}
      </div>

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
              token={token}
              search={parsed.search}
              revision={revision}
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
  revision: number
  onNavigate: (next: SongSearch) => void
}

function AlbumResults({ mine, token, search, revision, onNavigate }: ResultsProps) {
  const location = useLocation()
  const query = toCatalogParams(search).toString()
  const endpoint = mine ? '/api/Albums/mine' : '/api/Albums'
  const url = query ? `${endpoint}?${query}` : endpoint

  const { catalog, showLoading, retry } = useCatalogResults<AlbumPageData>(url, token, revision)
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
              <AlbumCatalogRow
                key={album.id}
                album={album}
                token={token}
                catalogSearch={location.search}
                loading={status === 'loading'}
                showStatus={mine}
                onChanged={retry}
                onDeleted={() => {
                  if (data.items.length === 1 && search.page > 1) {
                    onNavigate({ ...search, page: search.page - 1 })
                  } else {
                    retry()
                  }
                }}
              />
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

type AlbumCatalogRowProps = {
  album: Album
  token?: string
  catalogSearch: string
  loading: boolean
  showStatus: boolean
  onChanged: () => void
  onDeleted: () => void
}

function AlbumCatalogRow({
  album, token, catalogSearch, loading, onChanged, showStatus, onDeleted
}: AlbumCatalogRowProps) {
  const { actions, publishing } = useAlbumPublication(album, token, loading, onChanged)

  return (
    <li
      className="relative isolate grid grid-cols-[minmax(0,1fr)_auto] items-center
                 transition-colors has-[a:hover]:bg-hover has-[a:focus-visible]:bg-hover"
    >
      <Link
        to={`/albumai/${album.id}`}
        state={{ catalogSearch }}
        className="grid min-w-0 gap-1 px-4 py-3 wrap-anywhere
                   after:absolute after:inset-0 after:content-['']
                   focus-visible:outline-none focus-visible:after:outline-2
                   focus-visible:after:-outline-offset-2 focus-visible:after:outline-accent"
      >
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {showStatus && <AlbumStatus status={album.publicationStatus} />}
          <span className="text-xs text-muted">Dainų: {album.songs.length}</span>
        </span>

        <span className="font-semibold text-ink">{album.title}</span>

        {album.description && (
          <span className="line-clamp-2 text-sm text-muted">{album.description}</span>
        )}
      </Link>

      {token && (
        <div className="relative z-10 mr-1">
          <AlbumActions
            album={album}
            token={token}
            publicationActions={actions}
            disabled={loading || publishing}
            onChanged={onChanged}
            onDeleted={onDeleted}
          />
        </div>
      )}
    </li>
  )
}