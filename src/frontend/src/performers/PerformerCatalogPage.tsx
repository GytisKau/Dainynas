import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import MyPerformerResults from './MyPerformerResults'
import PerformerDialog from './PerformerDialog'
import PerformerSearchForm from './PerformerSearchForm'
import PublicPerformerResults from './PublicPerformerResults'
import { readSearch, type Search } from './performerQuery'
import CatalogViewNavigation from '../catalog/CatalogViewNavigation'

export default function PerformerCatalogPage({ token }: { token: string | null }) {
  const [params, setParams] = useSearchParams()
  const [revision, setRevision] = useState(0)
  const search = readSearch(params)

  function navigate(next: Search) {
    const nextParams = new URLSearchParams()

    if (next.view === 'mine') nextParams.set('rodinys', 'mano')
    if (next.view === 'public' && next.name) nextParams.set('name', next.name)
    if (next.page > 1) nextParams.set('page', String(next.page))

    setParams(nextParams)
  }

  // Pirmame "Mano" puslapyje URL nesikeičia, 
  // todėl po sukūrimo sąrašą atnaujiname per revision.
  function handleCreated() {
    if (typeof search !== 'string' && search.view === 'mine' && search.page === 1) {
      setRevision((previous) => previous + 1)
    } else {
      navigate({ view: 'mine', name: '', page: 1 })
    }
  }

  return (
    <main className="mx-auto w-full max-w-308 flex-1 px-4 pt-6 pb-8 md:pt-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-accent md:text-3xl">
          Pateikėjų katalogas
        </h1>

        {token && <PerformerDialog token={token} onSaved={handleCreated} />}
      </div>

      {typeof search === 'string' ? (
        <>
          <p role="alert">{search}</p>
          <Link to="/pateikejai" className="mt-3 inline-block text-accent underline">
            Atverti viešą katalogą
          </Link>
        </>
      ) : (
        <>
          {token && <CatalogViewNavigation path="/pateikejai" view={search.view} />}

          {search.view === 'public' ? (
            <>
              <PerformerSearchForm
                key={search.name}
                initialName={search.name}
                onSearch={(name) => navigate({ view: 'public', name, page: 1 })}
              />
              <PublicPerformerResults
                search={search}
                onPageChange={(page) => navigate({ ...search, page })}
              />
            </>
          ) : token ? (
            <MyPerformerResults
              token={token}
              page={search.page}
              revision={revision}
              onPageChange={(page) => navigate({ ...search, page })}
            />
          ) : (
            <div className="space-y-3">
              <p>Prisijunk, kad matytum savo pateikėjus.</p>
              <Link to="/prisijungti" className="text-accent underline">
                Prisijungti
              </Link>
              <Link to="/pateikejai" className="ml-4 text-accent underline">
                Vieši pateikėjai
              </Link>
            </div>
          )}
        </>
      )}
    </main>
  )
}
