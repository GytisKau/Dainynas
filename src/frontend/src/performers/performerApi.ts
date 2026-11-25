type DeleteResult = 'deleted' | 'already-missing'

export async function removePerformer(
  id: number | string,
  token: string,
): Promise<DeleteResult> {
  const response = await fetch(
    `/api/Performers/${encodeURIComponent(String(id))}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    },
  )

  if (response.status === 204) return 'deleted'
  if (response.status === 404) return 'already-missing'

  const problem = await response.json().catch(() => null)
  const messages: Record<number, string> = {
    401: 'Sesija nebegalioja. Prisijunk iš naujo.',
    403: 'Neturi teisės pašalinti šio pateikėjo.',
    409: 'Šio pateikėjo dabar pašalinti negalima.',
  }

  throw new Error(
    problem?.detail ||
    messages[response.status] ||
    `Pateikėjo pašalinti nepavyko (HTTP ${response.status}).`,
  )
}

type PublicationAction = 'submit' | 'unpublish'

const publicationErrors: Record<string, string> = {
  'Only drafts can be submitted.':
    'Peržiūrai galima pateikti tik juodraštį.',
  'A moderation request already exists.':
    'Šis pateikėjas jau turi nagrinėjamą prašymą.',
  'Only published performers can be unpublished.':
    'Paskelbimą galima atšaukti tik paskelbtam pateikėjui.',
  'Resolve the pending moderation request first.':
    'Pirmiausia turi būti išnagrinėtas esamas moderavimo prašymas.',
  'Cannot unpublish a performer with public songs.':
    'Šis pateikėjas turi viešų dainų. Pirmiausia atšauk jų paskelbimą.',
}

export async function changePerformerPublication(
  id: number | string,
  action: PublicationAction,
  token: string,
): Promise<void> {
  const response = await fetch(
    `/api/Performers/${encodeURIComponent(String(id))}/${action}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    },
  )

  const expectedStatus = action === 'submit' ? 202 : 204
  if (response.status === expectedStatus) return

  const problem = await response.json().catch(() => null)
  const reason = problem?.message

  if (typeof reason === 'string' && publicationErrors[reason]) {
    throw new Error(publicationErrors[reason])
  }

  const fallback: Record<number, string> = {
    401: 'Sesija baigėsi. Prisijunk iš naujo.',
    403: 'Neturi teisės keisti šio pateikėjo publikavimo būsenos.',
    404: 'Pateikėjas nerastas.',
    409: 'Dabartinė pateikėjo būsena neleidžia atlikti šio veiksmo.',
  }

  throw new Error(
    problem?.detail ||
    fallback[response.status] ||
    `Publikavimo veiksmas nepavyko (HTTP ${response.status}).`,
  )
}