import { useEffect, useRef, useState } from 'react'
import DeleteDialog from '../components/DeleteDialog'
import { useToast } from '../components/useToast'

type Props = {
  title: string
  href: string
  token: string
  onClose: () => void
  onDeleted: () => void
}

export default function DeleteSongDialog({
  title, href, token, onClose, onDeleted,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const notify = useToast()

  useEffect(() => {
    const element = dialog.current
    if (element && !element.open) element.showModal()
  }, [])

  async function removeSong() {
    if (deleting) return

    setDeleting(true)
    setError('')

    try {
      const response = await fetch(href, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      switch (response.status) {
        case 204:
          notify('success', `Daina „${title}“ pašalinta.`)
          break
        case 404:
          notify('success', 'Šios dainos jau nebėra.')
          break
        case 401:
          throw new Error('Sesija baigėsi. Prisijunk iš naujo.')
        case 403:
          throw new Error('Neturi teisės pašalinti šios dainos.')
        case 409: {
          const problem = await response.json().catch(() => null)
          const reasons: Record<string, string> = {
            'Only unpublished drafts can be deleted.':
              'Pašalinti galima tik dainos juodraštį.',
            'Song has comments, albums or moderation history.':
              'Daina turi komentarų, yra įtraukta į albumą arba turi moderavimo istoriją. Tokios dainos pašalinti negalima.',
          }
          throw new Error(reasons[problem?.message] ?? 'Šios dainos dabar pašalinti negalima.')
        }
        default:
          throw new Error(`Dainos pašalinti nepavyko (HTTP ${response.status}).`)
      }

      dialog.current?.close()
      onDeleted()
    } catch (error) {
      setError(error instanceof TypeError
        ? 'Nepavyko gauti serverio atsakymo. Prieš kartodamas patikrink „Mano“ dainų sąrašą.'
        : error instanceof Error ? error.message : 'Dainos pašalinti nepavyko.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <DeleteDialog
      dialogRef={dialog}
      title="Pašalinti dainą?"
      description={`Ar tikrai pašalinti dainą „${title}“ iš dainyno?`}
      deleting={deleting}
      error={error}
      onConfirm={removeSong}
      onClose={onClose}
    />
  )
}