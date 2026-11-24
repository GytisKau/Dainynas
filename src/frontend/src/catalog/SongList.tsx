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
      className="divide-y divide-line rounded-xl border border-line bg-surface"
    >
      {songs.map((song) => (
        <li
          key={song.id}
          className="grid gap-0.5 px-4 py-3 wrap-anywhere"
        >
          {song.recordingPlace && (
            <span className="text-xs font-medium text-accent uppercase">
              {song.recordingPlace}
            </span>
          )}

          <Link
            to={`/dainos/${song.id}`}
            className="w-fit max-w-full font-semibold text-ink hover:text-accent hover:underline"
          >
            {song.title}
          </Link>

          <span className="text-muted">{song.performerName}</span>
        </li>
      ))}
    </ul>
  )
}