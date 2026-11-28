export type Song = {
  id: number | string
  title: string
  performerName: string
  recordingPlace?: string | null
}

export type SongDetails = Song & {
  performerId: number | string
  recordingYear?: number | string | null
  lyrics?: string | null
  audioUrl?: string | null
  externalArchiveUrl?: string | null
  publicationStatus: 'Draft' | 'Pending' | 'Published'
  links: Partial<Record<'update' | 'submit' | 'unpublish' | 'delete' , {
    href: string
    method: string
  }>>
}

export type SongComment = {
  id: number | string
  authorName?: string | null
  text: string
  createdAt: string
  links?: Partial<Record<'update' | 'delete', { href: string; method: string }>>
}

export const songStatusLabels = {
  Draft: 'Juodraštis',
  Pending: 'Laukia peržiūros',
  Published: 'Paskelbta',
} satisfies Record<SongDetails['publicationStatus'], string>