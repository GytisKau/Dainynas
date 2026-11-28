import type { PerformerOption } from '../performers/types'

type PerformerPage = {
  items: PerformerOption[]
  totalPages: number | string
}

export async function loadPerformerOptions(
  source: 'public' | 'mine',
  signal: AbortSignal,
  token?: string,
): Promise<PerformerOption[]> {
  const endpoint = source === 'mine' ? '/api/Performers/mine' : '/api/Performers'
  const options: PerformerOption[] = []
  let page = 1
  let totalPages: number

  do {
    const params = new URLSearchParams({ page: String(page), pageSize: '10' })
    const response = await fetch(`${endpoint}?${params}`, {
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal,
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const result: PerformerPage = await response.json()
    options.push(...result.items)
    totalPages = Number(result.totalPages)
    page += 1
  } while (page <= totalPages)

  return options
}