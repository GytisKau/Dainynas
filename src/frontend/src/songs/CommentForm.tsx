import { useState } from 'react'
import { useToast } from '../components/useToast'
import type { SongComment } from './types'

const fieldClass =
  'mt-1 block w-full rounded-md border border-field-border bg-field px-3 py-2 text-ink'

type Props = {
  songId: number | string
  token: string
  comment?: SongComment
  onSaved: (comment: SongComment) => void
  onCancel?: () => void
}

export default function CommentForm({
  songId, token, comment, onSaved, onCancel,
}: Props) {
  const [sending, setSending] = useState(false)
  const notify = useToast()

  async function submitComment(form: HTMLFormElement) {
    if (sending) return

    const data = new FormData(form)
    const text = String(data.get('text') ?? '').trim()
    const authorName = String(data.get('authorName') ?? '').trim()

    if (!text) {
      notify('error', 'Įrašyk komentaro tekstą.')
      form.querySelector('textarea')?.focus()
      return
    }

    setSending(true)

    try {
      const update = comment?.links?.update
      if (comment && !update) {
        throw new Error('Neturi teisės redaguoti šio komentaro.')
      }

      const response = await fetch(update?.href ?? '/api/Comments', {
        method: comment ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          songId: Number(songId),
          text,
          authorName: authorName || null,
        }),
      })

      if (!response.ok) {
        switch (response.status) {
          case 400: throw new Error('Patikrink komentaro tekstą ir autoriaus vardą.')
          case 401: throw new Error('Sesija baigėsi. Prisijunk iš naujo.')
          case 403: throw new Error('Neturi teisės redaguoti šio komentaro.')
          case 404: throw new Error('Daina arba komentaras nebepasiekiamas.')
          default: throw new Error(`Komentaro išsaugoti nepavyko (HTTP ${response.status}).`)
        }
      }

      // POST grąžina sukurtą komentarą, o sėkmingo PUT atsakymo kūnas tuščias.
      const saved: SongComment = comment
        ? { ...comment, text, authorName: authorName || null }
        : await response.json()

      if (!comment) form.reset()
      onSaved(saved)
      notify('success', comment ? 'Komentaras atnaujintas.' : 'Komentaras paskelbtas.')
    } catch (error) {
      const message =
        error instanceof TypeError
          ? 'Nepavyko susisiekti su serveriu. Patikrink ryšį.'
          : error instanceof Error
            ? error.message
            : 'Komentaro išsaugoti nepavyko.'

      notify('error', message)
    } finally {
      setSending(false)
    }
  }

  return (
    <form
      className="my-5"
      onSubmit={(event) => {
        event.preventDefault()
        void submitComment(event.currentTarget)
      }}
    >
      <fieldset disabled={sending} className="grid min-w-0 gap-3">
        <legend className="mb-3 font-semibold">{comment ? 'Redaguoti komentarą' : 'Rašyti komentarą'}</legend>

        <label className="block text-sm">
          Rodomas vardas <span className="text-muted">(nebūtina)</span>
          <input
            name="authorName"
            type="text"
            autoComplete="nickname"
            maxLength={200}
            defaultValue={comment?.authorName ?? ''}
            className={`${fieldClass} sm:max-w-sm`}
          />
        </label>

        <label className="block text-sm">
          Komentaras
          <textarea
            name="text"
            required
            maxLength={2000}
            rows={3}
            defaultValue={comment?.text ?? ''}
            className={`${fieldClass} resize-y`}
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={sending}
            className="min-h-11 cursor-pointer rounded-lg bg-accent px-4 font-semibold
                      text-on-accent transition-colors hover:bg-accent-hover
                      disabled:cursor-wait disabled:opacity-60"
          >
            {sending ? 'Siunčiama…' : comment ? 'Išsaugoti pakeitimus' : 'Skelbti komentarą'}
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={sending}
              className="min-h-11 cursor-pointer rounded-lg border border-field-border
                        px-4 text-ink transition-colors hover:bg-hover
                        disabled:cursor-wait disabled:opacity-60"
            >
              Atšaukti
            </button>
          )}
        </div>
      </fieldset>
    </form>
  )
}