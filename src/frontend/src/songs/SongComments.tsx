import { useState } from 'react'
import { Link } from 'react-router'
import CommentForm from './CommentForm'

import type { SongComment } from './types'
import { useApiResource } from '../hooks/useApiResource'
import CommentRow from './CommentRow'

type Props = {
  performerId: number | string
  songId: number | string
  token?: string
}

export default function SongComments({ performerId, songId, token }: Props) {
  const comments = useApiResource<SongComment[]>(
    `/api/Performers/${performerId}/songs/${songId}/comments`,
    token,
  )

  return (
    <section
      aria-labelledby="comments-heading"
      className="rounded-xl border border-line bg-surface p-5 md:p-8"
    >
      {comments.status === 'ready' ? (
        <CommentList
          initialComments={comments.data}
          songId={songId}
          token={token}
        />
      ) : (
        <>
          <h2 id="comments-heading" className="text-xl font-semibold">
            Komentarai
          </h2>

          {comments.status === 'loading' ? (
            <p role="status" className="mt-3 text-muted">
              Įkeliami komentarai…
            </p>
          ) : (
            <p role="alert" className="mt-3 text-muted">
              Komentarų įkelti nepavyko.
            </p>
          )}
        </>
      )}
    </section>
  )
}

function CommentList({
  initialComments, songId, token,
}: {
  initialComments: SongComment[]
  songId: number | string
  token?: string | null
}) {
  const [items, setItems] = useState(initialComments)

  return (
    <>
      <h2 id="comments-heading" className="text-xl font-semibold">
        Komentarai ({items.length})
      </h2>

      {token ? (
        <CommentForm
          songId={songId}
          token={token}
          onSaved={(created) => setItems((list) => [created, ...list])}
        />
      ) : (
        <p className="my-4 text-sm text-muted">
          <Link to="/prisijungti" className="font-medium text-ink underline">
            Prisijunk
          </Link>
          , jei nori parašyti komentarą.
        </p>
      )}

      {items.length === 0 ? (
        <p className="mt-3 text-muted">Ši daina dar neturi komentarų.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {items.map((comment) => (
            <CommentRow
              key={comment.id}
              comment={comment}
              songId={songId}
              token={token}
              onSaved={(saved) => setItems((list) =>
                list.map((item) => item.id === saved.id ? saved : item)
              )}
              onDeleted={(id) => setItems((list) =>
                list.filter((item) => item.id !== id)
              )}
            />
          ))}
        </ul>
      )}
    </>
  )
}