import { Link, useLocation, useSearchParams } from 'react-router'
import CatalogViewNavigation from '../../catalog/CatalogViewNavigation'
import { readSongCatalogQuery, toCatalogParams } from '../../catalog/catalogQuery'
import Pagination from '../../catalog/Pagination'
import SongList from '../SongList'
import SongSearchForm from './SongSearchForm'
import { useCatalogResults } from '../../catalog/useCatalogResults'
import { useState } from 'react'
import CreateSongDialog from '../CreateSongDialog'
import RowActions, { type RowAction } from '../../components/RowActions'
import { SongFormDialog } from '../CreateSongDialog'
import DeleteSongDialog from '../DeleteSongDialog'
import { songStatusLabels, type SongDetails } from '../types'
import type { SongFilters, SongPage, SongSearch } from './types'

export default function SongCatalogPage({ token }: { token?: string }) {
  const [params, setParams] = useSearchParams()
  const parsed = readSongCatalogQuery(params)
  const [revision, setRevision] = useState(0)

  function handleCreated() {
    if (parsed.ok && parsed.mine && parsed.search.page === 1) {
      setRevision((value) => value + 1)
      return
    }

    const next = new URLSearchParams({ rodinys: 'mano' })
    if (parsed.ok && parsed.search.pageSize !== 10) {
      next.set('pageSize', String(parsed.search.pageSize))
    }

    setParams(next)
  }

  function navigate(next: SongSearch) {
    const nextParams = toCatalogParams(next)
    if (parsed.ok && parsed.mine) nextParams.set('rodinys', 'mano')
    setParams(nextParams)
  }

  return (
    <main className="mx-auto w-full max-w-308 flex-1 px-4 pt-6 pb-8 md:pt-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-accent md:text-3xl">
          Dainų katalogas
        </h1>

        {token && <CreateSongDialog token={token} onCreated={handleCreated} />}
      </div>

      {!parsed.ok ? (
        <>
          <p role="alert">Netinkama katalogo nuoroda. {parsed.message}</p>
          <Link to="/" className="mt-3 inline-block text-accent underline">
            Atverti viešų dainų katalogą
          </Link>
        </>
      ) : (
        <>
          {token && (
            <CatalogViewNavigation
              path="/"
              view={parsed.mine ? 'mine' : 'public'}
              publicLabel="Viešos"
            />
          )}

          {parsed.mine && !token ? (
            <p className="text-muted">
              Kad matytum savo dainas,{' '}
              <Link to="/prisijungti" className="text-ink underline underline-offset-4">
                prisijunk
              </Link>
              .
            </p>
          ) : (
            <CatalogResults
              key={parsed.mine ? 'mine' : 'public'}
              mine={parsed.mine}
              token={parsed.mine ? token : undefined}
              search={parsed.search}
              revision={revision}
              onNavigate={navigate}
            />
          )}
        </>
      )}
    </main>
  )
}

type SelectedSong = {
  mode: 'edit' | 'delete'
  song: SongDetails
}

type ResultsProps = {
  mine: boolean
  token?: string
  search: SongSearch
  revision: number
  onNavigate: (next: SongSearch) => void
}

function CatalogResults({ mine, token, search, revision, onNavigate }: ResultsProps) {
  const location = useLocation()
  const query = toCatalogParams(search).toString()
  const endpoint = mine ? '/api/Songs/mine' : '/api/Songs'
  const url = query ? `${endpoint}?${query}` : endpoint
  const [selected, setSelected] = useState<SelectedSong | null>(null)

  const { catalog, showLoading, retry } =
    useCatalogResults<SongPage<SongDetails>>(url, token, revision)

  const { data, status } = catalog

  function handleSearch(filters: SongFilters) {
    const next = { ...search, ...filters, page: 1 }

    if (toCatalogParams(next).toString() === query) {
      retry()
    } else {
      onNavigate(next)
    }
  }

  function renderSongActions(song: SongDetails) {
    const actions: RowAction[] = []

    if (song.links.update) {
      actions.push({
        icon: 'edit',
        label: song.publicationStatus === 'Published'
          ? 'Siūlyti pakeitimus'
          : 'Redaguoti dainą',
        onSelect: () => setSelected({ mode: 'edit', song }),
      })
    }

    if (song.links.delete) {
      actions.push({
        icon: 'delete',
        label: 'Pašalinti dainą',
        onSelect: () => setSelected({ mode: 'delete', song }),
      })
    }

    if (actions.length === 0) return null

    return (
      <RowActions
        label={`Dainos „${song.title}“ veiksmai`}
        actions={actions}
        disabled={status === 'loading'}
      />
    )
  }

  function handleDeleted() {
    setSelected(null)

    if (data?.items.length === 1 && search.page > 1) {
      onNavigate({ ...search, page: search.page - 1 })
    } else {
      retry()
    }
  }

  let statusText = ''

  if (showLoading) {
    statusText = data ? 'Atnaujinamas sąrašas…' : 'Įkeliamos dainos…'
  } else if (data?.items.length) {
    statusText = mine
      ? `Tavo dainų: ${data.totalItems}`
      : `Rasta dainų: ${data.totalItems}`
  } else if (data && Number(data.page) > 1) {
    statusText = 'Šiame puslapyje dainų nėra.'
  } else if (data) {
    statusText = mine ? 'Dar nesukūrei nė vienos dainos.' : 'Dainų pagal šią paiešką nerasta.'
  }

  return (
    <>
      {!mine && (
        <SongSearchForm
          initialFilters={{
            title: search.title,
            year: search.year,
            performerId: search.performerId,
          }}
          activeFilterCount={[search.year, search.performerId].filter(Boolean).length}
          onSearch={handleSearch}
        />
      )}

      {status === 'error' ? (
        <div className="my-3">
          <p role="alert">{catalog.message}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-2 cursor-pointer text-accent underline"
          >
            Bandyti dar kartą
          </button>
        </div>
      ) : (
        <p role="status" className="my-3 min-h-6 text-sm text-muted">
          {statusText}
        </p>
      )}

      {data && data.items.length > 0 && (
        <SongList
          songs={data.items}
          loading={status === 'loading'}
          catalogSearch={location.search}
          getStatusLabel={mine
            ? (song) => songStatusLabels[song.publicationStatus]
            : undefined}
          renderAction={mine && token ? renderSongActions : undefined}
        />
      )}

      {data && (
        <Pagination
          page={Number(data.page)}
          totalPages={Number(data.totalPages)}
          onPageChange={(page) => onNavigate({ ...search, page })}
        />
      )}

      {data && data.items.length === 0 && Number(data.page) > 1 && (
        <button
          type="button"
          onClick={() => onNavigate({ ...search, page: 1 })}
          className="cursor-pointer text-accent underline"
        >
          Grįžti į pirmą puslapį
        </button>
      )}

      {selected?.mode === 'edit' && token && (
        <SongFormDialog
          song={selected.song}
          token={token}
          onClose={() => setSelected(null)}
          onSaved={() => {
            setSelected(null)
            retry()
          }}
        />
      )}

      {selected?.mode === 'delete' && token && selected.song.links.delete && (
        <DeleteSongDialog
          title={selected.song.title}
          href={selected.song.links.delete.href}
          token={token}
          onClose={() => setSelected(null)}
          onDeleted={handleDeleted}
        />
      )}
    </>
  )
}