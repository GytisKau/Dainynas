import { useEffect, useState } from 'react'
import SongSearchFields from './SongSearchFields'
import type { PerformerOption, SongSearchFormProps } from './types'
import { loadPerformerOptions } from './loadPerformerOptions'

export default function SongSearchForm(props: SongSearchFormProps) {
  const [performers, setPerformers] = useState<PerformerOption[]>([])
  const [performerStatus, setPerformerStatus] =
    useState<'loading' | 'ready' | 'error'>('loading')
  const [performerAttempt, setPerformerAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadPerformers() {
      try {
        const options = await loadPerformerOptions('public', controller.signal)
        if (controller.signal.aborted) return

        options.sort((a, b) => a.name.localeCompare(b.name, 'lt'))
        setPerformers(options)
        setPerformerStatus('ready')
      } catch {
        if (!controller.signal.aborted) setPerformerStatus('error')
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
