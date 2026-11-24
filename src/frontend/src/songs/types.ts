import type { Song } from '../catalog/types'

export type SongDetails = Song & {
  performerId: number | string
  recordingYear?: number | string | null
  lyrics?: string | null
  audioUrl?: string | null
  externalArchiveUrl?: string | null
}

export type PerformerDetails = {
  name: string
  birthYear?: number | string | null
  residence?: string | null
  photoUrl?: string | null
}

export type SongComment = {
  id: number | string
  authorName?: string | null
  text: string
  createdAt: string
}