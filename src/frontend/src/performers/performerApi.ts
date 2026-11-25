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