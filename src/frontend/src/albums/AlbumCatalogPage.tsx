import type { SubmitEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import Pagination from '../catalog/Pagination'
import { parseCatalogQuery, toCatalogParams } from '../catalog/catalogQuery'
import type { SongSearch } from '../catalog/types'
import { useCatalogResults } from '../catalog/useCatalogResults'
import type { AlbumPageData } from './types'

const albumKeys = new Set(['title', 'page', 'pageSize'])

export default function AlbumCatalogPage() {
  const [params, setParams] = useSearchParams()
  const parsed = parseCatalogQuery(params, albumKeys)

  return (
    <main className="mx-auto w-full max-w-308 flex-1 px-4 pt-6 pb-8 md:pt-8">
      <h1 className="mb-4 text-2xl font-semibold text-accent md:text-3xl">
        Albumų katalogas
      </h1>

      {parsed.ok ? (
        <AlbumResults
          search={parsed.search}
          onNavigate={(next) => setParams(toCatalogParams(next))}
        />
      ) : (
        <>
          <p role="alert">{parsed.message}</p>
          <Link to="/albumai" className="mt-3 inline-block text-accent underline">
            Išvalyti parametrus
          </Link>
        </>
      )}
    </main>
  )
}

type ResultsProps = {
  search: SongSearch
  onNavigate: (next: SongSearch) => void
}

function AlbumResults({ search, onNavigate }: ResultsProps) {
  const query = toCatalogParams(search).toString()
  const url = query ? `/api/Albums?${query}` : '/api/Albums'
  const { catalog, showLoading, retry } = useCatalogResults<AlbumPageData>(url)
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
  } else if (data && data.items.length > 0) {
    statusText = `Rasta albumų: ${data.totalItems}`
  } else if (data) {
    statusText = Number(data.page) > 1
      ? 'Šiame puslapyje albumų nėra.'
      : 'Albumų pagal šią paiešką nerasta.'
  }

  return (
    <>
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