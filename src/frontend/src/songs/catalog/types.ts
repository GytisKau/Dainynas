import type { Song } from "../types"

export type SongPage<T extends Song = Song> = {
  items: T[]
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