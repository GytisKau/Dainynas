export type AlbumSong = {
  id: number | string
  title: string
  performerName: string
  recordingPlace?: string | null
  position: number | string
}

export type Album = {
  id: number | string
  title: string
  description?: string | null
  publicationStatus: 'Draft' | 'Pending' | 'Published'
  songs: AlbumSong[]
  links: Partial<Record<'update' | 'delete' | 'submit' | 'unpublish', {
    href: string
    method: string
  }>>
}

export type AlbumPageData = {
  items: Album[]
  page: number | string
  totalPages: number | string
  totalItems: number | string
}