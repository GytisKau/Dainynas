import { useState } from 'react'
import RowActions, { type RowAction } from '../components/RowActions'
import { useToast } from '../components/useToast'
import { songStatusLabels, type SongDetails } from './types'
import { Link, useLocation, useNavigate } from 'react-router'
import { SongFormDialog } from './CreateSongDialog'
import DeleteSongDialog from './DeleteSongDialog'

type Props = {
  song: SongDetails
  token?: string
  onSongChanged: (updated: SongDetails) => void
}

type Action = 'submit' | 'unpublish'

const conflictMessages: Record<string, string> = {
  'Only drafts can be submitted.':
    'Peržiūrai galima pateikti tik juodraštį.',
  'Song has no valid performer.':
    'Dainai reikia priskirti pateikėją.',
  'Publish the performer before submitting this song.':
    'Pirmiausia turi būti paskelbtas pateikėjas. Jo profilį gali atidaryti kortelėje „Apie pateikėją“.',
  'A moderation request already exists.':
    'Ši daina jau turi nagrinėjamą prašymą.',
  'Only published songs can be unpublished.':
    'Paskelbimą galima atšaukti tik paskelbtai dainai.',
  'Resolve the pending moderation request first.':
    'Pirmiausia moderatorius turi išnagrinėti esamą dainos prašymą.',
  'Cannot unpublish a song used by a public album.':
    'Ši daina įtraukta į paskelbtą albumą, todėl jos paskelbimo atšaukti negalima.',
}

export default function SongPublication({
  song: current, token, onSongChanged,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [needsRefresh, setNeedsRefresh] = useState(false)
  const notify = useToast()

  async function refreshSong() {
    const response = await fetch(`/api/Songs/${encodeURIComponent(String(current.id))}`, {
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const updated: SongDetails = await response.json()
    onSongChanged(updated)
    setNeedsRefresh(false)
  }

  async function retryRefresh() {
    if (busy) return
    setBusy(true)

    try {
      await refreshSong()
    } catch {
      notify('error', 'Dainos būsenos įkelti nepavyko. Patikrink ryšį.')
    } finally {
      setBusy(false)
    }
  }

  async function publish(action: Action) {
    const link = current.links[action]
    if (!token || !link || busy || needsRefresh) return

    setBusy(true)

    try {
      const response = await fetch(link.href, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })

      const expected = action === 'submit' ? 202 : 204
      if (response.status !== expected) {
        switch (response.status) {
          case 401:
            throw new Error('Sesija baigėsi. Prisijunk iš naujo.')
          case 403:
            throw new Error('Neturi teisės keisti šios dainos paskelbimo būsenos.')
          case 404:
            throw new Error('Daina nerasta.')
          case 409: {
            const problem = await response.json().catch(() => null)
            throw new Error(
              conflictMessages[problem?.message] ??
              'Dabartinė dainos būsena neleidžia atlikti šio veiksmo.',
            )
          }
          default:
            throw new Error(`Dainos būsenos pakeisti nepavyko (HTTP ${response.status}).`)
        }
      }

      notify('success', action === 'submit'
        ? 'Daina pateikta moderatoriui peržiūrėti.'
        : 'Dainos paskelbimas atšauktas. Ji vėl yra juodraštis.')

      // POST jau pavyko. Jei GET nepavyktų, kartosime tik būsenos nuskaitymą.
      setNeedsRefresh(true)
      try {
        await refreshSong()
      } catch {
        return
      }
    } catch (error) {
      if (error instanceof TypeError) {
        setNeedsRefresh(true)
        notify('error', 'Negautas serverio atsakymas. Atnaujink dainos būseną.')
      } else {
        notify('error', error instanceof Error ? error.message : 'Veiksmas nepavyko.')
      }
    } finally {
      setBusy(false)
    }
  }

  const actions: RowAction[] = []

  if (token && current.links.update) {
    actions.push({
      icon: 'edit',
      label: current.publicationStatus === 'Published'
        ? 'Siūlyti pakeitimus'
        : 'Redaguoti dainą',
      onSelect: () => setEditing(true),
    })
  }

  if (token && current.links.submit) {
    actions.push({
      icon: 'submit',
      label: 'Pateikti peržiūrai',
      onSelect: () => void publish('submit'),
    })
  }

  if (token && current.links.unpublish) {
    actions.push({
      icon: 'unpublish',
      label: 'Atšaukti paskelbimą',
      onSelect: () => void publish('unpublish'),
    })
  }

  if (token && current.links.delete) {
    actions.push({
      icon: 'delete',
      label: 'Pašalinti dainą',
      onSelect: () => setConfirmingDelete(true),
    })
  }

  const waitingForPerformer =
    !needsRefresh &&
    Boolean(token && current.links.update) &&
    current.publicationStatus === 'Draft' &&
    !current.links.submit

  return (
    <>
      {needsRefresh ? (
        <div className="mb-2 text-sm text-muted">
          {busy ? (
            <span role="status">Tikrinama dainos būsena…</span>
          ) : (
            <button
              type="button"
              onClick={() => void retryRefresh()}
              className="cursor-pointer text-accent underline underline-offset-4"
            >
              Atnaujinti dainos būseną
            </button>
          )}
        </div>
      ) : (
        (actions.length > 0 || current.publicationStatus !== 'Published') && (
          <p role="status" className="mb-2 text-xs font-medium text-accent">
            {songStatusLabels[current.publicationStatus]}
          </p>
        )
      )}

      <div className="flex items-center justify-between gap-3">
        <h1 className="min-w-0 wrap-anywhere text-3xl font-semibold text-ink md:text-4xl">
          {current.title}
        </h1>

        {actions.length > 0 && !needsRefresh && (
          <div className="shrink-0">
            <RowActions
              label={`Dainos „${current.title}“ veiksmai`}
              actions={actions}
              disabled={busy}
            />
          </div>
        )}
      </div>

      {waitingForPerformer && (
        <p className="mt-2 max-w-prose text-sm text-muted">
          Kad galėtum pateikti dainą peržiūrai, jos pateikėjas turi būti paskelbtas.
          Jei pateikėjas dar yra juodraštis, pateik jį peržiūrai. Jei jau pateikei,
          palauk moderatoriaus patvirtinimo.{' '}
          <Link
            to="/pateikejai?rodinys=mano"
            className="font-medium text-ink underline underline-offset-4 hover:text-accent"
          >
            Mano pateikėjai
          </Link>
        </p>
      )}

      {editing && token && (
        <SongFormDialog
          song={current}
          token={token}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false)
            setNeedsRefresh(true)
            void retryRefresh()
          }}
        />
      )}

      {confirmingDelete && token && current.links.delete && (
        <DeleteSongDialog
          title={current.title}
          href={current.links.delete.href}
          token={token}
          onClose={() => setConfirmingDelete(false)}
          onDeleted={() => {
            const search = location.state?.catalogSearch
            void navigate(
              {
                pathname: '/',
                search: typeof search === 'string' ? search : '?rodinys=mano',
              },
              { replace: true },
            )
          }}
        />
      )}
    </>
  )
}