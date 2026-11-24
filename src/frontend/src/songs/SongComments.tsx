import type { SongComment } from './types'
import { useApiResource } from './useApiResource'

type Props = {
  performerId: number | string
  songId: number | string
}

const dateFormat = new Intl.DateTimeFormat('lt-LT', {
  dateStyle: 'medium',
})

export default function SongComments({ performerId, songId }: Props) {
  const comments = useApiResource<SongComment[]>(
    `/api/Performers/${performerId}/songs/${songId}/comments`,
  )

  return (
    <section
      aria-labelledby="comments-heading"
      className="rounded-xl border border-line bg-surface p-5 md:p-8"
    >
      <h2 id="comments-heading" className="text-xl font-semibold">
        Komentarai
        {comments.status === 'ready' && ` (${comments.data.length})`}
      </h2>

      {comments.status === 'loading' && (
        <p role="status" className="mt-3 text-muted">Įkeliami komentarai…</p>
      )}

      {comments.status === 'error' && (
        <p className="mt-3 text-muted">Komentarų įkelti nepavyko.</p>
      )}

      {comments.status === 'ready' && (
        comments.data.length === 0 ? (
          <p className="mt-3 text-muted">Ši daina dar neturi komentarų.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {comments.data.map((comment) => (
              <li key={comment.id} className="py-4">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-semibold">
                    {comment.authorName?.trim() || 'Autorius nenurodytas'}
                  </span>
                  <time dateTime={comment.createdAt} className="text-sm text-muted">
                    {dateFormat.format(new Date(comment.createdAt))}
                  </time>
                </div>
                <p className="mt-2 wrap-anywhere whitespace-pre-line">
                  {comment.text}
                </p>
              </li>
            ))}
          </ul>
        )
      )}
    </section>
  )
}