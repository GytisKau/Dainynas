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
  compact?: boolean
  catalogSearch?: string
  renderAction?: (song: T, index: number) => ReactNode
}

export default function SongList<T extends SongListItem>({
  songs, loading, numbered = false, compact = false, catalogSearch, renderAction,
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
          className={`relative isolate grid grid-cols-[minmax(0,1fr)_auto]
                      transition-colors has-[a:hover]:bg-hover has-[a:focus-visible]:bg-hover
                      [&>:nth-child(2)]:relative [&>:nth-child(2)]:z-10
                      [&>:nth-child(2)]:mr-1 ${
                        numbered ? 'items-center' : 'items-start [&>:nth-child(2)]:mt-0.75'
                      }`}
        >
          <Link
            to={`/dainos/${song.id}`}
            state={catalogSearch === undefined ? undefined : { catalogSearch }}
            className={`flex min-w-0 self-stretch gap-3
                        after:absolute after:inset-0 after:z-0 after:content-['']
                        focus-visible:outline-none focus-visible:after:outline-2
                        focus-visible:after:-outline-offset-2 focus-visible:after:outline-accent ${
                          compact
                            ? 'min-h-11 items-center px-3 py-1.5'
                            : 'items-baseline px-4 py-3'
                        }`}
          >
            {numbered && (
              <span
                aria-hidden="true"
                className="min-w-5 self-center text-sm text-muted tabular-nums"
              >
                {index + 1}
              </span>
            )}

            {compact ? (
              <span className="grid min-w-0 gap-0.5 wrap-anywhere">
                <span className="text-sm font-medium leading-snug text-ink">
                  {song.title}
                </span>
                {song.performerName && (
                  <span className="text-xs leading-snug text-muted">
                    {song.performerName}
                  </span>
                )}
              </span>
            ) : (
              <span className="grid min-w-0 gap-0.5 wrap-anywhere">
                {song.recordingPlace && (
                  <span className="text-xs font-medium text-accent uppercase">
                    {song.recordingPlace}
                  </span>
                )}
                <span className="font-semibold text-ink">{song.title}</span>
                {song.performerName && (
                  <span className="text-muted">{song.performerName}</span>
                )}
              </span>
            )}
          </Link>

          {renderAction?.(song, index)}
        </li>
      ))}
    </List>
  )
}