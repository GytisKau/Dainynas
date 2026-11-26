import { useRef, useState } from 'react'
import RowActions, { type RowAction } from '../components/RowActions'
import { useToast } from '../components/useToast'
import CommentForm from './CommentForm'
import type { SongComment } from './types'
import DeleteDialog from '../components/DeleteDialog'

type Props = {
  comment: SongComment
  songId: number | string
  token?: string | null
  onSaved: (comment: SongComment) => void
  onDeleted: (id: SongComment['id']) => void
}

const dateFormat = new Intl.DateTimeFormat('lt-LT', { dateStyle: 'medium' })

export default function CommentRow({
  comment, songId, token, onSaved, onDeleted,
}: Props) {
  const notify = useToast()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const deleteDialog = useRef<HTMLDialogElement>(null)
  const [deleteError, setDeleteError] = useState('')

  function openDeleteDialog() {
    setDeleteError('')
    deleteDialog.current?.showModal()
  }

  const author = comment.authorName?.trim() || 'Autorius nenurodytas'

  async function removeComment() {
    const link = comment.links?.delete
    if (!token || !link || deleting) return

    setDeleting(true)
    setDeleteError('')
    try {
      const response = await fetch(link.href, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        switch (response.status) {
          case 401: throw new Error('Sesija baigėsi. Prisijunk iš naujo.')
          case 403: throw new Error('Neturi teisės pašalinti šio komentaro.')
          case 404: throw new Error('Komentaras nebepasiekiamas. Atnaujink sąrašą.')
          default: throw new Error(`Komentaro pašalinti nepavyko (HTTP ${response.status}).`)
        }
      }

      deleteDialog.current?.close()
      onDeleted(comment.id)
      notify('success', 'Komentaras pašalintas.')
    } catch (error) {
      setDeleteError(
        error instanceof TypeError
          ? 'Nepavyko gauti serverio atsakymo. Patikrink ryšį.'
          : error instanceof Error
            ? error.message
            : 'Komentaro pašalinti nepavyko.',
      )
    } finally {
      setDeleting(false)
    }
  }

  if (editing && token && comment.links?.update) {
    return (
      <li className="py-2">
        <CommentForm
          songId={songId}
          token={token}
          comment={comment}
          onCancel={() => setEditing(false)}
          onSaved={(saved) => {
            onSaved(saved)
            setEditing(false)
          }}
        />
      </li>
    )
  }

  const actions: RowAction[] = []
  if (token && comment.links?.update) {
    actions.push({ icon: 'edit', label: 'Redaguoti', onSelect: () => setEditing(true) })
  }
  if (token && comment.links?.delete) {
    actions.push({ icon: 'delete', label: 'Pašalinti', onSelect: openDeleteDialog })
  }

  return (
    <li className="flex items-start justify-between gap-3 py-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="wrap-anywhere font-semibold">{author}</span>
          <time dateTime={comment.createdAt} className="text-sm text-muted">
            {dateFormat.format(new Date(comment.createdAt))}
          </time>
        </div>
        <p className="mt-2 wrap-anywhere whitespace-pre-line">{comment.text}</p>
      </div>

      {actions.length > 0 && (
        <RowActions
          label={`Komentaro Nr. ${comment.id} veiksmai`}
          actions={actions}
          disabled={deleting}
        />
      )}

      {token && comment.links?.delete && (
        <DeleteDialog
          dialogRef={deleteDialog}
          title="Pašalinti komentarą?"
          description={`Ar pašalinti komentarą „${
            comment.text.length > 120
              ? `${comment.text.slice(0, 120)}…`
              : comment.text
          }“?`}
          deleting={deleting}
          error={deleteError}
          onConfirm={removeComment}
        />
      )}
    </li>
  )
}