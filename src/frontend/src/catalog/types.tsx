export type Song = {
  id: number | string
  title: string
  performerName: string
  recordingPlace?: string | null
}

export type SongPage = {
  items: Song[]
  page: number | string
  pageSize: number | string
  totalItems: number | string
  totalPages: number | string
}

export type SongFilters = {
  title: string
  year: string
  performerId: string
}

export type SongSearch = SongFilters & {
  page: number
  pageSize: number
}

export const emptyFilters: SongFilters = {
  title: '',
  year: '',
  performerId: '',
}

