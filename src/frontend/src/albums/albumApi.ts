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