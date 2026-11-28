import type { Album } from './types'

export type AlbumPublicationAction = 'submit' | 'unpublish'

const conflictMessages: Record<string, string> = {
  'Only drafts can be submitted.':
    'Peržiūrai galima pateikti tik juodraštį.',
  'Publish all referenced songs before the album.':
    'Visos albumo dainos ir jų pateikėjai turi būti paskelbti.',
  'A moderation request already exists.':
    'Šis albumas jau turi nagrinėjamą prašymą.',
  'Only published albums can be unpublished.':
    'Paskelbimą galima atšaukti tik paskelbtam albumui.',
  'Resolve the pending moderation request first.':
    'Pirmiausia moderatorius turi išnagrinėti esamą albumo prašymą.',
}

export async function changeAlbumPublication(
  href: string,
  action: AlbumPublicationAction,
  token: string,
): Promise<void> {
  const response = await fetch(href, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })

  const expectedStatus = action === 'submit' ? 202 : 204
  if (response.status === expectedStatus) return

  switch (response.status) {
    case 401:
      throw new Error('Sesija baigėsi. Prisijunk iš naujo.')
    case 403:
      throw new Error('Neturi teisės keisti šio albumo publikavimo būsenos.')
    case 404:
      throw new Error('Albumas nerastas.')
    case 409: {
      const problem = await response.json().catch(() => null)
      throw new Error(
        conflictMessages[problem?.message] ??
        'Albumo būsena pasikeitė. Atnaujink puslapį.',
      )
    }
    default:
      throw new Error(`Albumo būsenos pakeisti nepavyko (HTTP ${response.status}).`)
  }
}

type SaveResult = 'created' | 'updated' | 'proposed'

export async function saveAlbum(
  token: string,
  title: string,
  description: string,
  album?: Album,
): Promise<SaveResult> {
  const update = album?.links.update
  if (album && !update) {
    throw new Error('Šio albumo dabar redaguoti negalima.')
  }

  const songIds = album
    ? [...album.songs]
        .sort((a, b) => Number(a.position) - Number(b.position))
        .map((song) => Number(song.id))
    : []

  const response = await fetch(update?.href ?? '/api/Albums', {
    method: album ? 'PUT' : 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
      description: description || null,
      songIds,
    }),
  })

  if (!album && response.status === 201) return 'created'
  if (album && response.status === 204) return 'updated'
  if (album && response.status === 202) return 'proposed'

  switch (response.status) {
    case 400:
      throw new Error('Patikrink albumo duomenis ir ar visos jo dainos vis dar pasiekiamos.')
    case 401:
      throw new Error('Sesija baigėsi. Prisijunk iš naujo.')
    case 403:
      throw new Error('Neturi teisės redaguoti šio albumo.')
    case 404:
      throw new Error('Albumas nerastas.')
    case 409: {
      const problem = await response.json().catch(() => null)
      throw new Error(
        problem?.message === 'A moderation request already exists.'
          ? 'Šio albumo pakeitimai jau laukia moderatoriaus sprendimo.'
          : 'Albumo būsena pasikeitė. Atnaujink puslapį.',
      )
    }
    default:
      throw new Error(`Albumo išsaugoti nepavyko (HTTP ${response.status}).`)
  }
}

export async function deleteAlbum(href: string, token: string) {
  const response = await fetch(href, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })

  if (response.status === 204) return 'deleted'
  if (response.status === 404) return 'already-missing'

  switch (response.status) {
    case 401:
      throw new Error('Sesija baigėsi. Prisijunk iš naujo.')
    case 403:
      throw new Error('Neturi teisės pašalinti šio albumo.')
    case 409: {
      const problem = await response.json().catch(() => null)
      throw new Error(
        problem?.message === 'Album has moderation history.'
          ? 'Šis albumas turi moderavimo istoriją, todėl jo pašalinti negalima.'
          : 'Pašalinti galima tik albumo juodraštį.',
      )
    }
    default:
      throw new Error(`Albumo pašalinti nepavyko (HTTP ${response.status}).`)
  }
}