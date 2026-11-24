import type { Song } from './types'
import { Link } from 'react-router'

type SongListProps = {
  songs: Song[]
  loading: boolean
}

export default function SongList({ songs, loading }: SongListProps) {
  return (
    <ul
      aria-busy={loading}
      className="divide-y divide-line rounded-xl border border-line bg-surface overflow-hidden"
    >
      {songs.map((song) => (
        <li key={song.id}>
          <Link
            to={`/dainos/${song.id}`}
            className="grid gap-0.5 px-4 py-3 wrap-anywhere transition-colors hover:bg-hover focus-visible:bg-hover focus-visible:-outline-offset-2"
          >
            {song.recordingPlace && (
              <span className="text-xs font-medium text-accent uppercase">
                {song.recordingPlace}
              </span>
            )}

            <span className="font-semibold text-ink">{song.title}</span>
            <span className="text-muted">{song.performerName}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}