import { useEffect, useState } from 'react'
import SongSearchFields from './SongSearchFields'
import type { PerformerOption, SongSearchFormProps } from './types'

type PerformerPage = {
  items: PerformerOption[]
  totalPages: number | string
}

export default function SongSearchForm(props: SongSearchFormProps) {
  const [performers, setPerformers] = useState<PerformerOption[]>([])
  const [performerStatus, setPerformerStatus] =
    useState<'loading' | 'ready' | 'error'>('loading')
  const [performerAttempt, setPerformerAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadPerformers() {
      const options: PerformerOption[] = []
      let page = 1
      let totalPages: number

      try {
        do {
          const params = new URLSearchParams({
            page: String(page),
            pageSize: '10',
          })

          const response = await fetch(`/api/Performers?${params}`, {
            headers: { Accept: 'application/json' },
            signal: controller.signal,
          })

          if (!response.ok) throw new Error(`HTTP ${response.status}`)

          const result: PerformerPage = await response.json()
          options.push(...result.items)
          totalPages = Number(result.totalPages)
          page += 1
        } while (page <= totalPages)

        if (!controller.signal.aborted) {
          options.sort((a, b) => a.name.localeCompare(b.name, 'lt'))
          setPerformers(options)
          setPerformerStatus('ready')
        }
      } catch {
        if (!controller.signal.aborted) {
          setPerformerStatus('error')
        }
      }
    }

    void loadPerformers()
    return () => controller.abort()
  }, [performerAttempt])

  const { title, year, performerId } = props.initialFilters

  // URL filtrų pokytis atkuria formos laukus. 
  // Pateikėjų sąrašas lieka šiame komponente.
  return (
    <SongSearchFields
      key={JSON.stringify([title, year, performerId])}
      {...props}
      performers={performers}
      performerStatus={performerStatus}
      onRetryPerformers={() => {
        setPerformerStatus('loading')
        setPerformerAttempt((attempt) => attempt + 1)
      }}
    />
  )
}
