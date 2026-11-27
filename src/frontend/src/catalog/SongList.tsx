import type { ReactNode } from 'react'
import { Link } from 'react-router'

type SongListItem = {
  id: number | string
  title: string
  performerName?: string | null
  recordingPlace?: string | null
}

type Props<T extends SongListItem> = {
  songs: T[]
  loading: boolean
  numbered?: boolean
  renderAction?: (song: T) => ReactNode
}

export default function SongList<T extends SongListItem>({
  songs, loading, numbered = false, renderAction,
}: Props<T>) {
  const List = numbered ? 'ol' : 'ul'

  return (
    <List
      aria-busy={loading}
      className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface"
    >
      {songs.map((song, index) => (
        <li
          key={song.id}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-center"
        >
          <Link
            to={`/dainos/${song.id}`}
            className="flex min-w-0 items-baseline gap-3 self-stretch px-4 py-3
                       transition-colors hover:bg-hover focus-visible:bg-hover
                       focus-visible:-outline-offset-2"
          >
            {numbered && (
              <span aria-hidden="true" className="min-w-5 text-sm text-muted tabular-nums">
                {index + 1}.
              </span>
            )}

            <span className="grid min-w-0 gap-0.5 wrap-anywhere">
              {song.recordingPlace && (
                <span className="text-xs font-medium text-accent uppercase">
                  {song.recordingPlace}
                </span>
              )}
              <span className="font-semibold text-ink">{song.title}</span>
              {song.performerName && <span className="text-muted">{song.performerName}</span>}
            </span>
          </Link>

          {renderAction && <div className="pr-2">{renderAction(song)}</div>}
        </li>
      ))}
    </List>
  )
}