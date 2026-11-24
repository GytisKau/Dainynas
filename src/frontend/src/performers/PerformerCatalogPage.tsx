import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import Pagination from '../catalog/Pagination'
import { useCatalogResults } from '../catalog/useCatalogResults'
import type { PerformerDetails } from '../songs/types'

type PerformerItem = PerformerDetails & {
  id: number | string
}

type PerformerPage = {
  items: PerformerItem[]
  page: number | string
  totalItems: number | string
  totalPages: number | string
}

type Search = {
  name: string
  page: number
}

function readSearch(params: URLSearchParams): Search | string {
  const seen = new Set<string>()

  for (const key of params.keys()) {
    if (key !== 'name' && key !== 'page') {
      return `Nežinomas pateikėjų katalogo parametras „${key}“.`
    }
    if (seen.has(key)) {
      return `Parametras „${key}“ nuorodoje pakartotas.`
    }
    seen.add(key)
  }

  const rawPage = params.get('page') ?? '1'
  if (!/^[1-9]\d*$/.test(rawPage) || Number(rawPage) > 2147483647) {
    return 'Puslapio numeris turi būti teigiamas sveikasis skaičius iki 2147483647.'
  }

  return {
    name: params.get('name')?.trim() ?? '',
    page: Number(rawPage),
  }
}

export default function PerformerCatalogPage() {
  const [params, setParams] = useSearchParams()
  const search = readSearch(params)

  function navigate(next: Search) {
    const nextParams = new URLSearchParams()
    if (next.name) nextParams.set('name', next.name)
    if (next.page > 1) nextParams.set('page', String(next.page))
    setParams(nextParams)
  }

  return (
    <main className="mx-auto w-full max-w-308 flex-1 px-4 pt-6 pb-8 md:pt-8">
      <h1 className="mb-4 text-2xl font-semibold text-accent md:text-3xl">
        Pateikėjų katalogas
      </h1>

      {typeof search === 'string' ? (
        <>
          <p role="alert">{search}</p>
          <Link to="/pateikejai" className="mt-3 inline-block text-accent underline">
            Išvalyti parametrus
          </Link>
        </>
      ) : (
        <>
          <PerformerSearchForm
            key={search.name}
            initialName={search.name}
            onSearch={(name) => navigate({ name, page: 1 })}
          />
          <PerformerResults
            search={search}
            onPageChange={(page) => navigate({ ...search, page })}
          />
        </>
      )}
    </main>
  )
}

type SearchFormProps = {
  initialName: string
  onSearch: (name: string) => void
}

function PerformerSearchForm({ initialName, onSearch }: SearchFormProps) {
  const [name, setName] = useState(initialName)

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    onSearch(name.trim())
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid max-full grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-1"
    >
      <label htmlFor="performer-name-search" className="col-span-2">
        Vardas arba pavardė
      </label>
      <input
        id="performer-name-search"
        type="search"
        value={name}
        onChange={(event) => setName(event.target.value)}
        className="min-h-11 min-w-0 rounded-lg border border-field-border bg-field px-3 text-ink"
      />
      <button
        type="submit"
        className="min-h-11 rounded-lg bg-accent px-4 font-semibold text-on-accent transition-colors hover:bg-accent-hover"
      >
        Ieškoti
      </button>
    </form>
  )
}

type ResultsProps = {
  search: Search
  onPageChange: (page: number) => void
}

function PerformerResults({ search, onPageChange }: ResultsProps) {
  const params = new URLSearchParams({
    page: String(search.page),
    pageSize: '10',
  })
  if (search.name) params.set('name', search.name)

  const { catalog, showLoading, retry } = useCatalogResults<PerformerPage>(
    `/api/Performers?${params}`,
  )

  if (catalog.status === 'error') {
    return (
      <div className="my-4">
        <p role="alert">{catalog.message}</p>
        <button
          type="button"
          onClick={retry}
          className="mt-2 text-accent underline underline-offset-4"
        >
          Bandyti dar kartą
        </button>
      </div>
    )
  }

  if (!catalog.data) {
    return (
      <p role="status" className="my-3 min-h-6 text-sm text-muted">
        {showLoading ? 'Įkeliami pateikėjai…' : ''}
      </p>
    )
  }

  const { items, page, totalItems, totalPages } = catalog.data

  if (items.length === 0) {
    const isLaterPage = Number(page) > 1
    const emptyMessage = isLaterPage
      ? 'Šiame puslapyje pateikėjų nėra.'
      : 'Pateikėjų pagal šią paiešką nerasta.'

    return (
      <div className="my-3">
        <p role="status" className="min-h-6 text-sm text-muted">
          {showLoading ? 'Atnaujinamas sąrašas…' : emptyMessage}
        </p>
        {isLaterPage && (
          <button
            type="button"
            onClick={() => onPageChange(1)}
            className="mt-2 text-accent underline underline-offset-4"
          >
            Grįžti į pirmą puslapį
          </button>
        )}
      </div>
    )
  }

  return (
    <>
      <p role="status" className="my-3 min-h-6 text-sm text-muted">
        {showLoading ? 'Atnaujinamas sąrašas…' : `Rasta pateikėjų: ${totalItems}`}
      </p>

      <ul
        aria-busy={catalog.status === 'loading'}
        className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface"
      >
        {items.map((performer) => (
          <li key={performer.id}>
            <Link
              to={`/pateikejai/${performer.id}`}
              className="grid gap-0.5 px-4 py-3 wrap-anywhere transition-colors hover:bg-hover focus-visible:bg-hover focus-visible:-outline-offset-2"
            >
              {performer.residence && (
                <span className="text-xs font-medium text-accent uppercase">
                  {performer.residence}
                </span>
              )}

              <span className="font-semibold text-ink">{performer.name}</span>

              {performer.birthYear != null && (
                <span className="text-muted">
                  Gimimo metai: {performer.birthYear}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>

      <Pagination
        page={Number(page)}
        totalPages={Number(totalPages)}
        onPageChange={onPageChange}
      />
    </>
  )
}