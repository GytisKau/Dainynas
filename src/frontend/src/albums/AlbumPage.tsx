import { Link, useParams } from 'react-router'
import { useApiResource } from '../songs/useApiResource'
import type { Album } from './types'

export default function AlbumPage() {
  const { albumId } = useParams()
  const result = useApiResource<Album>(
    `/api/Albums/${encodeURIComponent(albumId ?? '')}`,
  )

  return (
    <main className="mx-auto w-full max-w-308 flex-1 px-4 pt-6 pb-8 md:pt-8">
      <nav aria-label="Naršymo kelias" className="mb-5 text-sm">
        <ol className="flex flex-wrap items-baseline gap-2">
          <li>
            <Link to="/albumai" className="text-accent underline underline-offset-4">
              Albumų katalogas
            </Link>
          </li>
          <li aria-hidden="true" className="text-muted">/</li>
          <li aria-current="page" className="wrap-anywhere text-muted">
            {result.status === 'ready' ? result.data.title : 'Albumas'}
          </li>
        </ol>
      </nav>

      {result.status === 'loading' && (
        <p role="status" className="text-muted">Įkeliamas albumas…</p>
      )}

      {result.status === 'error' && (
        <h1 className="text-2xl font-semibold">
          {result.statusCode === 404 ? 'Albumas nerastas' : 'Nepavyko įkelti albumo'}
        </h1>
      )}

      {result.status === 'ready' && <AlbumContent album={result.data} />}
    </main>
  )
}

function AlbumContent({ album }: { album: Album }) {
  const songs = [...album.songs].sort(
    (first, second) => Number(first.position) - Number(second.position),
  )

  return (
    <article className="rounded-xl border border-line bg-surface p-5 md:p-8">
      <h1 className="wrap-anywhere text-3xl font-semibold md:text-4xl">
        {album.title}
      </h1>

      {album.description && (
        <p className="mt-3 max-w-prose wrap-anywhere whitespace-pre-line text-muted">
          {album.description}
        </p>
      )}

      <h2 className="mt-8 text-xl font-semibold">Albumo dainos ({songs.length})</h2>

      {songs.length === 0 ? (
        <p className="mt-3 text-muted">Šiame albume dainų kol kas nėra.</p>
      ) : (
        <ol className="mt-3 divide-y divide-line">
          {songs.map((song, index) => (
            <li key={song.id}>
              <Link
                to={`/dainos/${song.id}`}
                className="flex items-baseline gap-3 rounded px-2 py-3 transition-colors hover:bg-hover focus-visible:bg-hover"
              >
                <span aria-hidden="true" className="min-w-6 text-muted tabular-nums">
                  {index + 1}.
                </span>
                <span className="wrap-anywhere font-semibold">{song.title}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </article>
  )
}