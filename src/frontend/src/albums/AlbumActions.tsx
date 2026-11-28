import { useEffect, useRef, useState } from 'react'
import DeleteDialog from '../components/DeleteDialog'
import RowActions, { type RowAction } from '../components/RowActions'
import { useToast } from '../components/useToast'
import { deleteAlbum } from './albumApi'
import { AlbumFormDialog } from './CreateAlbumDialog'
import type { Album } from './types'

type Props = {
  album: Album
  token: string
  publicationActions: RowAction[]
  disabled: boolean
  onChanged: () => void
  onDeleted: () => void
}

export default function AlbumActions({
  album, token, publicationActions, disabled, onChanged, onDeleted,
}: Props) {
  const [mode, setMode] = useState<'edit' | 'delete' | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  const notify = useToast()

  useEffect(() => {
    if (mode !== 'delete') return
    const element = dialog.current
    if (element && !element.open) element.showModal()
  }, [mode])

  async function confirmDelete() {
    const link = album.links.delete
    if (!link || deleting || disabled) return

    setDeleting(true)
    setDeleteError('')

    try {
      const result = await deleteAlbum(link.href, token)
      dialog.current?.close()
      notify('success', result === 'deleted'
        ? `Albumas „${album.title}“ pašalintas.`
        : 'Šio albumo jau nebėra.')
      onDeleted()
    } catch (error) {
      setDeleteError(error instanceof TypeError
        ? 'Nepavyko gauti serverio atsakymo. Patikrink albumų sąrašą.'
        : error instanceof Error ? error.message : 'Albumo pašalinti nepavyko.')
    } finally {
      setDeleting(false)
    }
  }

  const actions: RowAction[] = []

  if (album.links.update) {
    actions.push({
      icon: 'edit',
      label: album.publicationStatus === 'Published' ? 'Siūlyti pakeitimus' : 'Redaguoti albumą',
      onSelect: () => setMode('edit'),
    })
  }

  actions.push(...publicationActions)

  if (album.links.delete) {
    actions.push({
      icon: 'delete',
      label: 'Pašalinti albumą',
      onSelect: () => {
        setDeleteError('')
        setMode('delete')
      },
    })
  }

  if (actions.length === 0) return null

  return (
    <>
      <RowActions
        label={`Albumo „${album.title}“ veiksmai`}
        actions={actions}
        disabled={disabled || deleting}
      />

      {mode === 'edit' && (
        <AlbumFormDialog
          album={album}
          token={token}
          onClose={() => setMode(null)}
          onSaved={onChanged}
        />
      )}

      {mode === 'delete' && (
        <DeleteDialog
          dialogRef={dialog}
          title="Pašalinti albumą?"
          description={`Ar pašalinti albumą „${album.title}“? Dainos liks dainų kataloge.`}
          deleting={deleting}
          error={deleteError}
          onConfirm={confirmDelete}
          onClose={() => setMode(null)}
        />
      )}
    </>
  )
}