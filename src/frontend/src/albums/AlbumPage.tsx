import { useState } from 'react'
import SongList from '../catalog/SongList'
import RowActions from '../components/RowActions'
import { useToast } from '../components/useToast'
import { Link, useLocation, useParams } from 'react-router'
import { useApiResource } from '../songs/useApiResource'
import AlbumSongPicker from './AlbumSongPicker'
import type { Album, AlbumSong } from './types'

export default function AlbumPage({ token }: { token?: string }) {
  const { albumId } = useParams()
  const location = useLocation()
  const catalogSearch = location.state?.catalogSearch

  const catalogLink = {
    pathname: '/albumai',
    search: typeof catalogSearch === 'string' ? catalogSearch : '',
  }

  const result = useApiResource<Album>(
    `/api/Albums/${encodeURIComponent(albumId ?? '')}`,
    token,
  )

  return (
    <main className="mx-auto w-full max-w-308 flex-1 px-4 pt-6 pb-8 md:pt-8">
      <nav aria-label="Naršymo kelias" className="mb-5 text-sm">
        <ol className="flex flex-wrap items-baseline gap-2">
          <li>
            <Link to={catalogLink} className="text-accent underline underline-offset-4">
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

      {result.status === 'ready' && (
        <AlbumContent
          key={result.data.id}
          initialAlbum={result.data}
          token={token}
        />
      )}
    </main>
  )
}

const statusLabels = {
  Draft: 'Juodraštis',
  Pending: 'Laukia peržiūros',
  Published: 'Paskelbtas',
} as const

const cardClass = 'min-w-0 rounded-xl border border-line bg-surface p-5 md:p-6'

type AlbumContentProps = { initialAlbum: Album, token?: string}

function AlbumContent({ initialAlbum, token }: AlbumContentProps) {
 const [album, setAlbum] = useState(initialAlbum)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const notify = useToast()

  const songs = [...album.songs].sort((a, b) => Number(a.position) - Number(b.position))
  const canEdit = Boolean(token && album.publicationStatus === 'Draft' && album.links.update)
  const showPicker = canEdit && pickerOpen

  async function changeSong(song: Pick<AlbumSong, 'id' | 'title'>, add: boolean) {
    if (!token || !canEdit || savingId !== null) return

    setSavingId(String(song.id))
    try {
      const response = await fetch(`/api/Albums/${album.id}/songs/${song.id}`, {
        method: add ? 'PUT' : 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        switch (response.status) {
          case 400: throw new Error('Daina nebepasiekiama. Atnaujink dainų sąrašą.')
          case 401: throw new Error('Sesija baigėsi. Prisijunk iš naujo.')
          case 403: throw new Error('Neturi teisės keisti šio albumo.')
          case 404: throw new Error('Albumas nerastas.')
          case 409: throw new Error('Albumo būsena pasikeitė. Atnaujink puslapį.')
          default: throw new Error(`Albumo atnaujinti nepavyko (HTTP ${response.status}).`)
        }
      }

      const updated: Album = await response.json()
      setAlbum(updated)
      notify('success', add
        ? `Daina „${song.title}“ pridėta į albumą.`
        : `Daina „${song.title}“ pašalinta iš albumo.`)
    } catch (error) {
      notify('error', error instanceof TypeError
        ? 'Nepavyko gauti serverio atsakymo. Patikrink ryšį ir pakartok veiksmą.'
        : error instanceof Error ? error.message : 'Albumo atnaujinti nepavyko.')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="grid gap-5">
      <section aria-labelledby="album-title" className={cardClass}>
        <p className="mb-2 text-sm font-medium text-accent">
          {statusLabels[album.publicationStatus]}
        </p>
        <h1 id="album-title" className="wrap-anywhere text-3xl font-semibold md:text-4xl">
          {album.title}
        </h1>
        {album.description && (
          <p className="mt-3 max-w-prose wrap-anywhere whitespace-pre-line text-muted">
            {album.description}
          </p>
        )}
      </section>

      <div className={`grid items-start gap-5 ${
        showPicker ? 'lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]' : ''
      }`}>
        <section aria-labelledby="album-songs-title" className={cardClass}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="album-songs-title" className="text-xl font-semibold">
              Albumo dainos ({songs.length})
            </h2>

            {canEdit && (
              <button
                type="button"
                aria-expanded={showPicker}
                onClick={() => setPickerOpen((open) => !open)}
                className="min-h-11 cursor-pointer rounded-lg bg-accent px-4 font-semibold
                           text-on-accent hover:bg-accent-hover"
              >
                {showPicker ? 'Užverti pasirinkimą' : 'Pridėti dainą'}
              </button>
            )}
          </div>

          {songs.length === 0 ? (
            <p className="text-muted">Šiame albume dainų kol kas nėra.</p>
          ) : (
            <SongList
              songs={songs}
              loading={savingId !== null}
              numbered
              renderAction={canEdit ? (song) => (
                <RowActions
                  label={`Dainos „${song.title}“ veiksmai`}
                  disabled={savingId !== null}
                  actions={[{
                    icon: 'delete',
                    label: 'Pašalinti iš albumo',
                    onSelect: () => void changeSong(song, false),
                  }]}
                />
              ) : undefined}
            />
          )}
        </section>

        {showPicker && token && (
          <aside aria-labelledby="picker-title" className={cardClass}>
            <h2 id="picker-title" className="mb-4 text-xl font-semibold">
              Pridėti dainą
            </h2>
            <AlbumSongPicker
              token={token}
              album={album}
              savingId={savingId}
              onChangeSong={changeSong}
            />
          </aside>
        )}
      </div>
    </div>
  )
}