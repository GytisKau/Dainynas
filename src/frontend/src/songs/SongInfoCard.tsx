import { Link } from 'react-router'
import type { PerformerDetails, SongDetails } from './types'
import { useApiResource } from './useApiResource'
import { ArchiveMedia, ArchiveNotice } from './ArchiveMedia'

export default function SongInfoCard({
  song, token,
}: {
  song: SongDetails
  token?: string
}) {
  const performer = useApiResource<PerformerDetails>(
    `/api/Performers/${song.performerId}`,
    token,
  )

  const archiveUrl = song.externalArchiveUrl?.trim()
  const hasArchiveLink = archiveUrl && /^https?:\/\//i.test(archiveUrl)

  let archiveUnderMaintenance = false

  if (hasArchiveLink && archiveUrl) {
    try {
      const hostname = new URL(archiveUrl).hostname
      const maintenanceHost = import.meta.env.VITE_ARCHIVE_MAINTENANCE_HOST
      archiveUnderMaintenance = hostname === maintenanceHost?.trim().toLowerCase()
    } catch {
      // Netaisyklingo adreso negalime susieti su prižiūrimu archyvu.
    }
  }

  return (
    <aside className="min-w-0 rounded-xl border border-line bg-surface p-5">
      <h2 className="text-xl font-semibold">Apie pateikėją</h2>
      <Link
        to={`/pateikejai/${song.performerId}`}
        className="mt-3 inline-block font-semibold text-accent underline underline-offset-4"
      >
        {song.performerName}
      </Link>

      {performer.status === 'loading' && (
        <p role="status" className="mt-3 text-muted">Įkeliama informacija…</p>
      )}

      {performer.status === 'error' && (
        <p className="mt-3 text-muted">Pateikėjo informacijos įkelti nepavyko.</p>
      )}

      {performer.status === 'ready' && (
        <div className="mt-4 space-y-3">
          {performer.data.photoUrl && (
            <ArchiveMedia
              key={performer.data.photoUrl}
              kind="photo"
              src={performer.data.photoUrl}
              label={performer.data.name}
            />
          )}

          <dl className="space-y-2 text-sm">
            {performer.data.birthYear != null && (
              <div>
                <dt className="text-muted">Gimimo metai</dt>
                <dd>{performer.data.birthYear}</dd>
              </div>
            )}
            {performer.data.residence && (
              <div>
                <dt className="text-muted">Gyvenamoji vieta</dt>
                <dd>{performer.data.residence}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {hasArchiveLink && (
        <section className="mt-5 border-t border-line pt-4">
          <h3 className="font-semibold">Archyvo šaltinis</h3>
          <a
            href={archiveUrl}
            className="mt-2 inline-block text-accent underline underline-offset-4"
          >
            Atverti dainos įrašą archyve
          </a>
          {archiveUnderMaintenance && (
            <div className="mt-3">
              <ArchiveNotice>
                Archyve vyksta priežiūros darbai. Nuoroda gali laikinai neveikti.
              </ArchiveNotice>
            </div>
          )}
        </section>
      )}
    </aside>
  )
}