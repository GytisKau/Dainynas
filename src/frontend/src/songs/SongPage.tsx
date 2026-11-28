import { Link, useParams, useLocation } from 'react-router'
import SongInfoCard from './SongInfoCard'
import SongComments from './SongComments'
import { ArchiveMedia } from './ArchiveMedia'
import { useApiResource } from './useApiResource'
import type { SongDetails } from './types'
import SongPublication from './SongPublication'
import { useState } from 'react'

export default function SongPage({ token }: { token?: string }) {
  const { songId } = useParams()
  const location = useLocation()
  const resource = useApiResource<SongDetails>(
    `/api/Songs/${encodeURIComponent(songId ?? '')}`,
    token,
  )

  const [latest, setLatest] = useState<{
    original: SongDetails
    updated: SongDetails
  } | null>(null)

  const song = resource.status === 'ready' && latest?.original === resource.data
    ? { status: 'ready' as const, data: latest.updated }
    : resource

  function handleSongChanged(updated: SongDetails) {
    if (resource.status === 'ready') {
      setLatest({ original: resource.data, updated })
    }
  }

  const catalogSearch = location.state?.catalogSearch
  const catalogLink = {
    pathname: '/',
    search: typeof catalogSearch === 'string' ? catalogSearch : '',
  }

  return (
    <main className="mx-auto w-full max-w-308 flex-1 px-4 pt-6 pb-8">
      <nav aria-label="Naršymo kelias" className="mb-5 text-sm">
        <ol className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <li>
            <Link to={catalogLink} className="text-accent underline underline-offset-4">
              Dainų katalogas
            </Link>
          </li>
          <li aria-hidden="true" className="text-muted">/</li>
          <li aria-current="page" className="wrap-anywhere text-muted">
            {song.status === 'ready' ? song.data.title : 'Daina'}
          </li>
        </ol>
      </nav>

      {song.status === 'loading' && <p role="status">Įkeliama daina…</p>}

      {song.status === 'error' && (
        <h1 className="text-2xl font-semibold">
          {song.statusCode === 404
            ? 'Daina nerasta'
            : 'Nepavyko įkelti dainos'}
        </h1>
      )}

      {song.status === 'ready' && (
        <div className="grid items-start gap-5 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <SongContent song={song.data} token={token} onSongChanged={handleSongChanged} />
          <SongInfoCard song={song.data} token={token} />

          <div className="min-w-0 md:col-span-2">
            <SongComments
              key={song.data.id}
              performerId={song.data.performerId}
              songId={song.data.id}
              token={token}
            />
          </div>
        </div>
      )}
    </main>
  )
}

function SongContent({
  song, token, onSongChanged,
}: {
  song: SongDetails
  token?: string
  onSongChanged: (updated: SongDetails) => void
}) {
  const recording = [song.recordingPlace, song.recordingYear]
    .filter((value) => value != null && value !== '')
    .join(' · ')

  return (
    <article className="min-w-0 rounded-xl border border-line bg-surface p-5 md:p-8">
      <header>
        <SongPublication
          key={song.id}
          song={song}
          token={token}
          onSongChanged={onSongChanged}
        />
        <p className="mt-2 text-lg text-ink">{song.performerName}</p>
        {recording && (
          <p className="mt-1 text-sm text-muted">Įrašyta: {recording}</p>
        )}
      </header>

      <section aria-label="Garso įrašas" className="mt-6">
        {song.audioUrl ? (
          <ArchiveMedia
            key={song.audioUrl}
            kind="audio"
            src={song.audioUrl}
            label={`Dainos „${song.title}“ garso įrašas`}
          />
        ) : (
          <p className="text-sm text-muted">Garso įrašo nėra.</p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Dainos tekstas</h2>
        {song.lyrics?.trim() ? (
          <p className="mt-3 wrap-anywhere whitespace-pre-line leading-7">
            {song.lyrics}
          </p>
        ) : (
          <p className="mt-3 text-muted">Dainos tekstas nepateiktas.</p>
        )}
      </section>
    </article>
  )
}