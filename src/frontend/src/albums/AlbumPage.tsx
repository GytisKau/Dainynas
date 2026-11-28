import { useState } from 'react'
import SongList from '../songs/SongList'
import RowActions, { type RowAction } from '../components/RowActions'
import { useToast } from '../components/useToast'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { useApiResource } from '../hooks/useApiResource'
import AlbumSongPicker from './AlbumSongPicker'
import type { Album, AlbumSong } from './types'
import AlbumStatus from './AlbumStatus'
import { useAlbumPublication } from './useAlbumPublication'
import AlbumActions from './AlbumActions'

export default function AlbumPage({ token }: { token?: string }) {
  const [revision, setRevision] = useState(0)

  return (
    <AlbumDetails
      key={revision}
      token={token}
      onReload={() => setRevision((value) => value + 1)}
    />
  )
}

type AlbumDetailsProps = {
  token?: string
  onReload: () => void
}

// Čia prasideda tavo ankstesnės AlbumPage funkcijos turinys.
function AlbumDetails({ token, onReload }: AlbumDetailsProps) {
  const { albumId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
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
    <main className="mx-auto flex w-full max-w-308 flex-1 flex-col px-4 pt-6 pb-8 md:pt-8">
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
          onReload={onReload}
          token={token}
          onDeleted={() => {
            void navigate(catalogLink, { replace: true })
          }}
        />
      )}
    </main>
  )
}

const cardClass = 'min-w-0 rounded-xl border border-line bg-surface p-5 md:p-6'

type AlbumContentProps = {
  initialAlbum: Album
  token?: string
  onReload: () => void
  onDeleted: () => void
}

function AlbumContent({ initialAlbum, token, onReload, onDeleted }: AlbumContentProps) {
 const [album, setAlbum] = useState(initialAlbum)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const { actions: albumActions, publishing } = useAlbumPublication(
    album,
    token,
    savingId !== null,
    onReload,
  )
  const notify = useToast()
  
  const busy = publishing || savingId !== null

  const songs = [...album.songs].sort((a, b) => Number(a.position) - Number(b.position))
  const canEdit = Boolean(token && album.publicationStatus === 'Draft' && album.links.update)
  const showPicker = canEdit && pickerOpen

  async function changeSong(song: Pick<AlbumSong, 'id' | 'title'>, add: boolean) {
    if (!token || !canEdit || busy) return

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

  async function moveSong(index: number, direction: -1 | 1) {
    const update = album.links.update
    if (!token || !canEdit || !update || busy) return

    const nextIndex = index + direction
    const song = songs[index]
    const neighbour = songs[nextIndex]
    if (!song || !neighbour) return

    // songs jau surikiuotas pagal position. Sukeičiame dvi gretimas dainas kopijoje.
    const reordered = [...songs]
    reordered[index] = neighbour
    reordered[nextIndex] = song

    setSavingId(String(song.id))

    try {
      const response = await fetch(update.href, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: album.title,
          description: album.description ?? null,
          songIds: reordered.map((item) => Number(item.id)),
        }),
      })

      if (response.status === 202) {
        notify('success', 'Albumo pakeitimai pateikti moderatoriui peržiūrėti.')
        return
      }

      if (response.status !== 204) {
        switch (response.status) {
          case 400:
            throw new Error('Nepavyko išsaugoti tvarkos. Patikrink, ar visos dainos dar pasiekiamos.')
          case 401:
            throw new Error('Sesija baigėsi. Prisijunk iš naujo.')
          case 403:
            throw new Error('Neturi teisės redaguoti šio albumo.')
          case 404:
            throw new Error('Albumas nerastas.')
          case 409:
            throw new Error('Albumo šiuo metu keisti negalima. Atnaujink puslapį.')
          default:
            throw new Error(`Dainų tvarkos išsaugoti nepavyko (HTTP ${response.status}).`)
        }
      }

      setAlbum((current) => ({
        ...current,
        songs: reordered.map((item, i) => ({ ...item, position: i + 1 })),
      }))

      notify('success', `Daina „${song.title}“ perkelta į ${nextIndex + 1} vietą.`)
    } catch (error) {
      notify('error', error instanceof TypeError
        ? 'Nepavyko gauti serverio atsakymo. Atnaujink puslapį ir patikrink dainų tvarką.'
        : error instanceof Error ? error.message : 'Dainų tvarkos išsaugoti nepavyko.')
    } finally {
      setSavingId(null)
    }
  }

  function songActions(song: AlbumSong, index: number): RowAction[] {
    const actions: RowAction[] = []

    if (index > 0) {
      actions.push({
        icon: 'moveUp',
        label: 'Perkelti aukštyn',
        onSelect: () => void moveSong(index, -1),
      })
    }

    if (index < songs.length - 1) {
      actions.push({
        icon: 'moveDown',
        label: 'Perkelti žemyn',
        onSelect: () => void moveSong(index, 1),
      })
    }

    actions.push({
      icon: 'delete',
      label: 'Pašalinti iš albumo',
      onSelect: () => void changeSong(song, false),
    })

    return actions
  }

  return (
    <div
      className={`grid min-w-0 gap-5 ${
        showPicker ? 'lg:flex-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]' : ''
      }`}
    >
      <div className="grid min-w-0 content-start gap-5">
      <section aria-labelledby="album-title" className={cardClass}>
        <p role="status" className="mb-2 text-sm text-muted">
          {publishing
            ? 'Keičiama albumo būsena…'
            : <AlbumStatus status={album.publicationStatus} />}
        </p>

        <div className="flex items-center justify-between gap-3">
          <h1 id="album-title" className="min-w-0 wrap-anywhere text-3xl font-semibold md:text-4xl">
            {album.title}
          </h1>

          {token && (
            <div className="shrink-0">
              <AlbumActions
                album={album}
                token={token}
                publicationActions={albumActions}
                disabled={busy}
                onChanged={onReload}
                onDeleted={onDeleted}
              />
            </div>
          )}
        </div>
        {album.description && (
          <p className="mt-3 max-w-prose wrap-anywhere whitespace-pre-line text-muted">
            {album.description}
          </p>
        )}
      </section>

      <section aria-label="Albumo dainos" className="grid min-w-0 gap-3">
        {canEdit && (
          <button
            type="button"
            aria-expanded={showPicker}
            onClick={() => setPickerOpen((open) => !open)}
            className="min-h-11 cursor-pointer justify-self-end rounded-lg bg-accent
                      px-4 font-semibold text-on-accent transition-colors hover:bg-accent-hover"
          >
            {showPicker ? 'Užverti pasirinkimą' : 'Pridėti dainą'}
          </button>
        )}

        {songs.length === 0 ? (
          <p className="text-muted">Šiame albume dainų kol kas nėra.</p>
        ) : (
          <SongList
            songs={songs}
            loading={savingId !== null}
            numbered
            renderAction={canEdit ? (song, index) => (
              <RowActions
                label={`Dainos „${song.title}“ veiksmai`}
                disabled={busy}
                actions={songActions(song, index)}
              />
            ) : undefined}
          />
        )}
      </section>
    </div>

    {showPicker && token && (
      <aside aria-labelledby="picker-title" inert={publishing} className={`${cardClass} h-fit`}>
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
  )
}