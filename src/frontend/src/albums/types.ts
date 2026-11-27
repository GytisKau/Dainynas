export type AlbumSong = {
  id: number | string
  title: string
  position: number | string
}

export type Album = {
  id: number | string
  title: string
  description?: string | null
  publicationStatus: 'Draft' | 'Pending' | 'Published'
  songs: AlbumSong[]
  links: {
    update?: { href: string; method: string }
  }
}

export type AlbumPageData = {
  items: Album[]
  page: number | string
  totalPages: number | string
  totalItems: number | string
}