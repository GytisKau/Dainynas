import { useState, type SubmitEvent } from 'react'
import Pagination from '../catalog/Pagination'
import SongList from '../catalog/SongList'
import type { Song, SongPage } from '../catalog/types'
import { useCatalogResults } from '../catalog/useCatalogResults'
import CatalogViewNavigation from '../components/CatalogViewNavigation'
import type { Album } from './types'

type Source = 'public' | 'mine'

type Props = {
  album: Album
  token: string
  savingId: string | null
  onChangeSong: (song: Song, add: boolean) => Promise<void>
}

export default function AlbumSongPicker(props: Props) {
  const [source, setSource] = useState<Source>('public')

  return (
    <div className="grid gap-4">
      <CatalogViewNavigation
        view={source}
        publicLabel="Viešos"
        onViewChange={setSource}
      />
      <PickerResults key={source} {...props} source={source} />
    </div>
  )
}

function PickerResults({
  source, album, token, savingId, onChangeSong,
}: Props & { source: Source }) {
  const [title, setTitle] = useState('')
  const [page, setPage] = useState(1)

  const params = new URLSearchParams({ page: String(page), pageSize: '10' })
  if (source === 'public' && title) params.set('title', title)

  const endpoint = source === 'mine' ? '/api/Songs/mine' : '/api/Songs'
  const { catalog, showLoading, retry } = useCatalogResults<SongPage>(
    `${endpoint}?${params}`,
    source === 'mine' ? token : undefined,
  )

  const included = new Set(album.songs.map((song) => String(song.id)))
  const data = catalog.data

  function search(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const next = String(fields.get('title') ?? '').trim()

    if (page === 1 && next === title) retry()
    setTitle(next)
    setPage(1)
  }

  return (
    <div className="grid min-w-0 gap-3">
      {source === 'public' && (
        <form onSubmit={search} className="flex items-end gap-2">
          <label className="grid min-w-0 flex-1 gap-1 text-sm">
            Dainos pavadinimas
            <input
              type="search"
              name="title"
              className="min-h-11 min-w-0 rounded-lg border border-field-border bg-field px-3"
            />
          </label>
          <button
            type="submit"
            className="min-h-11 cursor-pointer rounded-lg border border-field-border
                       px-3 text-sm font-medium hover:bg-hover"
          >
            Ieškoti
          </button>
        </form>
      )}

      {showLoading && <p role="status" className="text-sm text-muted">Įkeliamos dainos…</p>}

      {catalog.status === 'error' && (
        <div>
          <p role="alert">{catalog.message}</p>
          <button type="button" onClick={retry} className="mt-2 cursor-pointer underline">
            Bandyti dar kartą
          </button>
        </div>
      )}

      {data && data.items.length > 0 && (
        <SongList
          songs={data.items}
          loading={catalog.status === 'loading'}
          renderAction={(song) => {
            const added = included.has(String(song.id))
            const busy = savingId === String(song.id)

            return (
              <button
                type="button"
                aria-label={`Daina „${song.title}“ albume`}
                aria-pressed={added}
                aria-busy={busy}
                title={added ? 'Pašalinti iš albumo' : 'Pridėti į albumą'}
                disabled={savingId !== null || catalog.status === 'loading'}
                onClick={() => void onChangeSong(song, !added)}
                className={`grid size-11 cursor-pointer place-items-center rounded-lg
                  transition-colors hover:bg-hover disabled:cursor-wait ${
                    added ? 'text-green-700 dark:text-green-400' : 'text-muted'
                  } ${busy ? 'opacity-50' : ''}`}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-5"
                >
                  <path d={added ? 'm5 12 4 4L19 6' : 'M12 5v14M5 12h14'} />
                </svg>
              </button>
            )
          }}
        />
      )}

      {catalog.status === 'ready' && data?.items.length === 0 && (
        <p className="text-sm text-muted">
          {source === 'mine' ? 'Savo dainų šiame puslapyje neturi.' : 'Dainų nerasta.'}
        </p>
      )}

      {data && (
        <Pagination
          page={Number(data.page)}
          totalPages={Number(data.totalPages)}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}