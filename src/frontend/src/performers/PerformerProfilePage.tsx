import { Link, useParams, useLocation } from 'react-router'
import { ArchiveMedia } from '../songs/ArchiveMedia'
import type { PerformerDetails } from './types'
import { useApiResource } from '../hooks/useApiResource'

type ProfileSong = {
  id: number | string
  title: string
  recordingYear?: number | string | null
}

type PerformerProfile = PerformerDetails & {
  id: number | string
  songCount: number | string
  songs: ProfileSong[]
}

export default function PerformerProfilePage({ token }: { token?: string }) {
  const location = useLocation()
  const catalogSearch = location.state?.catalogSearch
  const catalogLink = {
    pathname: '/pateikejai',
    search: typeof catalogSearch === 'string' ? catalogSearch : '',
  }
  const { performerId } = useParams()
  const profile = useApiResource<PerformerProfile>(
    `/api/Performers/${encodeURIComponent(performerId ?? '')}/profile`,
    token,
  )

  return (
    <main className="mx-auto w-full max-w-308 flex-1 px-4 pt-6 pb-8">
      <nav aria-label="Naršymo kelias" className="mb-5 text-sm">
        <ol className="flex flex-wrap items-baseline gap-2">
          <li>
            <Link to={catalogLink} className="text-accent underline underline-offset-4">
              Pateikėjų katalogas
            </Link>
          </li>
          <li aria-hidden="true" className="text-muted">/</li>
          <li aria-current="page" className="wrap-anywhere text-muted">
            {profile.status === 'ready' ? profile.data.name : 'Pateikėjas'}
          </li>
        </ol>
      </nav>

      {profile.status === 'loading' && (
        <p role="status" className="text-muted">Įkeliamas pateikėjo profilis…</p>
      )}

      {profile.status === 'error' && (
        <h1 className="text-2xl font-semibold">
          {profile.statusCode === 404
            ? 'Pateikėjas nerastas'
            : 'Nepavyko įkelti pateikėjo profilio'}
        </h1>
      )}

      {profile.status === 'ready' && <ProfileContent performer={profile.data} />}
    </main>
  )
}

function ProfileContent({ performer }: { performer: PerformerProfile }) {
  const catalogParams = new URLSearchParams({
    performerId: String(performer.id),
  })

  return (
    <div className="grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <section
        aria-labelledby="performer-name"
        className="min-w-0 rounded-xl border border-line bg-surface p-5 md:p-6"
      >
        <h1 id="performer-name" className="wrap-anywhere text-3xl font-semibold">
          {performer.name}
        </h1>

        {performer.photoUrl && (
          <div className="mt-4">
            <ArchiveMedia
              key={performer.photoUrl}
              kind="photo"
              src={performer.photoUrl}
              label={performer.name}
            />
          </div>
        )}

        <dl className="mt-5 space-y-3">
          {performer.birthYear != null && (
            <div>
              <dt className="text-sm text-muted">Gimimo metai</dt>
              <dd>{performer.birthYear}</dd>
            </div>
          )}
          {performer.residence && (
            <div>
              <dt className="text-sm text-muted">Gyvenamoji vieta</dt>
              <dd>{performer.residence}</dd>
            </div>
          )}
        </dl>
      </section>

      <section
        aria-labelledby="performer-songs"
        className="min-w-0 rounded-xl border border-line bg-surface p-5 md:p-6"
      >
        <h2 id="performer-songs" className="text-xl font-semibold">
          Dainos ({performer.songCount})
        </h2>

        {performer.songs.length === 0 ? (
          <p className="mt-3 text-muted">Šiame profilyje dainų kol kas nėra.</p>
        ) : (
          <>
            <ul className="mt-3 divide-y divide-line">
              {performer.songs.map((song) => (
                <li key={song.id}>
                  <Link
                    to={`/dainos/${song.id}`}
                    className="flex items-baseline justify-between gap-4 rounded px-2 py-3 hover:bg-hover"
                  >
                    <span className="min-w-0 wrap-anywhere font-semibold text-accent">
                      {song.title}
                    </span>
                    {song.recordingYear != null && (
                      <span className="shrink-0 text-sm text-muted">
                        {song.recordingYear}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>

            <Link
              to={`/?${catalogParams}`}
              className="mt-5 inline-block text-accent underline underline-offset-4"
            >
              Atverti dainas kataloge
            </Link>
          </>
        )}
      </section>
    </div>
  )
}