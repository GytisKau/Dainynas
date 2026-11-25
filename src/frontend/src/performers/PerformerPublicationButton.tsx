import { useState } from 'react'
import { useToast } from '../components/useToast'
import { changePerformerPublication } from './performerApi'
import type { EditablePerformer } from './PerformerDialog'

type Props = {
  performer: EditablePerformer
  token: string
  disabled: boolean
  onChanged: () => void
}

export default function PerformerPublicationButton({
  performer,
  token,
  disabled,
  onChanged,
}: Props) {
  const notify = useToast()
  const [pending, setPending] = useState(false)

  const { id, name, publicationStatus } = performer
  if (publicationStatus !== 'Draft' && publicationStatus !== 'Published') {
    return null
  }

  const action = publicationStatus === 'Draft' ? 'submit' : 'unpublish'
  const label = action === 'submit' ? 'Pateikti peržiūrai' : 'Atšaukti paskelbimą'

  async function handleClick() {
    if (pending || disabled) return
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

  return (
    <button
      type="button"
      disabled={pending || disabled}
      aria-label={`${label}: ${name}`}
      onClick={handleClick}
      className="min-h-11 rounded-lg border border-field-border px-3
                 text-sm font-medium text-ink transition-colors
                 hover:bg-hover disabled:opacity-60"
    >
      {pending ? 'Siunčiama…' : label}
    </button>
  )
}