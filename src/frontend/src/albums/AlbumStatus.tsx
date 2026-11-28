import type { Album } from './types'

const statusLabels = {
  Draft: 'Juodraštis',
  Pending: 'Laukia peržiūros',
  Published: 'Paskelbtas',
} satisfies Record<Album['publicationStatus'], string>

export default function AlbumStatus({ status }: { status: Album['publicationStatus'] }) {
  return (
    <span className="text-xs font-medium text-accent">
      {statusLabels[status]}
    </span>
  )
}