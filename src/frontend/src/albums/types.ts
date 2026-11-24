export type AlbumSong = {
  id: number | string
  title: string
  position: number | string
}

export type Album = {
  id: number | string
  title: string
  description?: string | null
  songs: AlbumSong[]
}

export type AlbumPageData = {
  items: Album[]
  page: number | string
  totalPages: number | string
  totalItems: number | string
}