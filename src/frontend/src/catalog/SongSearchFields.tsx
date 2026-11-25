import { useState } from 'react'
import type { SubmitEvent } from 'react'
import type { PerformerOption, SongFilters, SongSearchFormProps } from './types'

type SongSearchFieldsProps = SongSearchFormProps & {
  performers: PerformerOption[]
  performerStatus: 'loading' | 'ready' | 'error'
  onRetryPerformers: () => void
}

export default function SongSearchFields({
  activeFilterCount,
  initialFilters,
  onSearch,
  performers,
  performerStatus,
  onRetryPerformers,
}: SongSearchFieldsProps) {
  const [filters, setFilters] = useState<SongFilters>(initialFilters)
  const [filtersOpen, setFiltersOpen] = useState(
    Boolean(initialFilters.year || initialFilters.performerId),
  )

  function updateFilter(field: keyof SongFilters, value: string) {
    setFilters((previous) => ({ ...previous, [field]: value }))
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    onSearch({ ...filters, title: filters.title.trim() })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-2 gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(8rem,1fr)_auto] md:items-end"
    >
      <div className="col-span-2 grid gap-1 md:col-span-1">
        <label htmlFor="song-title">Dainos pavadinimas</label>
        <input
          id="song-title"
          type="search"
          value={filters.title}
          onChange={(event) => updateFilter('title', event.target.value)}
          className="min-h-11 w-full rounded-lg border border-field-border bg-field px-3"
        />
      </div>

      <button
        type="button"
        aria-expanded={filtersOpen}
        aria-controls="catalog-filters"
        onClick={() => setFiltersOpen((open) => !open)}
        className="min-h-11 rounded-lg border border-field-border bg-field px-4 md:hidden"
      >
        Filtrai{activeFilterCount > 0 && ` (${activeFilterCount})`}
      </button>

      <div
        id="catalog-filters"
        className={`col-span-2 gap-3 md:contents ${filtersOpen ? 'grid' : 'hidden'}`}
      >
        <div className="grid min-w-0 gap-1">
          <label htmlFor="performer">Pateikėjas</label>
          <select
            id="performer"
            value={filters.performerId}
            onChange={(event) => updateFilter('performerId', event.target.value)}
            disabled={performerStatus !== 'ready'}
            className="min-h-11 w-full rounded-lg border border-field-border bg-field px-3 disabled:opacity-60"
          >
            <option value="">
              {performerStatus === 'loading' ? 'Įkeliami pateikėjai…' : 'Visi pateikėjai'}
            </option>
            {filters.performerId &&
              !performers.some((person) => String(person.id) === filters.performerId) && (
                <option value={filters.performerId}>
                  {performerStatus === 'loading'
                    ? 'Įkeliamas pateikėjo vardas…'
                    : `Pateikėjas #${filters.performerId}`}
                </option>
              )
            }
            {performers.map((performer) => (
              <option key={performer.id} value={String(performer.id)}>
                {performer.name}
              </option>
            ))}
          </select>

          {performerStatus === 'error' && (
            <p role="status" className="text-sm">
              Nepavyko įkelti pateikėjų.{' '}
              <button
                type="button"
                className="underline"
                onClick={onRetryPerformers}
              >
                Bandyti dar kartą
              </button>
            </p>
          )}
        </div>

        <div className="grid min-w-0 gap-1">
          <label htmlFor="recording-year">Įrašymo metai</label>
          <input
            id="recording-year"
            type="number"
            step="1"
            placeholder="Pvz., 1972"
            value={filters.year}
            onChange={(event) => updateFilter('year', event.target.value)}
            className="min-h-11 w-full rounded-lg border border-field-border bg-field px-3"
          />
        </div>
      </div>

      <button
        type="submit"
        className="col-start-2 row-start-2 min-h-11 rounded-lg bg-accent px-4 font-semibold text-on-accent transition-colors hover:bg-accent-hover md:col-start-auto md:row-start-auto"
      >
        Ieškoti
      </button>
    </form>
  )
}