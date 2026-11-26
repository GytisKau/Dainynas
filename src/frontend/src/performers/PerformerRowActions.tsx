import { useState } from 'react'
import RowActions, { type RowAction } from '../components/RowActions'
import { useToast } from '../components/useToast'
import { changePerformerPublication } from './performerApi'
import type { EditablePerformer } from './PerformerDialog'

type Props = {
  performer: EditablePerformer
  token: string
  disabled: boolean
  onEdit: () => void
  onDelete: () => void
  onChanged: () => void
}

export default function PerformerRowActions({
  performer,
  token,
  disabled,
  onEdit,
  onDelete,
  onChanged,
}: Props) {
  const notify = useToast()
  const [pending, setPending] = useState(false)
  const { id, name, publicationStatus } = performer

  async function publish(action: 'submit' | 'unpublish') {
    if (disabled || pending) return
    setPending(true)

    try {
      await changePerformerPublication(id, action, token)
      notify(
        'success',
        action === 'submit'
          ? `Pateikėjas „${name}“ pateiktas peržiūrai.`
          : `Pateikėjo „${name}“ paskelbimas atšauktas.`,
      )
      onChanged()
    } catch (error) {
      notify(
        'error',
        error instanceof TypeError
          ? 'Nepavyko gauti serverio atsakymo. Patikrink ryšį ir pateikėjo būseną.'
          : error instanceof Error
            ? error.message
            : 'Publikavimo veiksmas nepavyko.',
      )
    } finally {
      setPending(false)
    }
  }

  const actions: RowAction[] = []

  if (publicationStatus === 'Draft') {
    actions.push(
      { icon: 'edit', label: 'Redaguoti', onSelect: onEdit },
      {
        icon: 'submit',
        label: 'Pateikti peržiūrai',
        onSelect: () => void publish('submit'),
      },
      { icon: 'delete', label: 'Pašalinti', onSelect: onDelete },
    )
  }

  if (publicationStatus === 'Published') {
    actions.push(
      { icon: 'edit', label: 'Siūlyti pakeitimus', onSelect: onEdit },
      {
        icon: 'unpublish',
        label: 'Atšaukti paskelbimą',
        onSelect: () => void publish('unpublish'),
      },
    )
  }

  if (actions.length === 0) return null

  return (
    <RowActions
      label={`Pateikėjo „${name}“ veiksmai`}
      actions={actions}
      disabled={disabled || pending}
    />
  )
}