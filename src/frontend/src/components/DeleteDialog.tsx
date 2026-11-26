import { useId, type RefObject } from 'react'

type Props = {
  dialogRef: RefObject<HTMLDialogElement | null>
  title: string
  description: string
  deleting: boolean
  error: string
  onConfirm: () => void
  onClose?: () => void
}

export default function DeleteDialog({
  dialogRef, title, description, deleting, error, onConfirm, onClose,
}: Props) {
  const titleId = useId()
  const descriptionId = useId()

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        if (deleting) event.preventDefault()
      }}
      onClose={onClose}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md
                 overflow-y-auto rounded-xl border border-line bg-surface p-5
                 text-ink backdrop:bg-black/60 md:p-7"
    >
      <h2 id={titleId} className="text-xl font-semibold">{title}</h2>
      <p id={descriptionId} className="mt-3 wrap-anywhere">{description}</p>

      {error && <p role="alert" className="mt-3 text-sm">{error}</p>}

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          autoFocus
          disabled={deleting}
          onClick={() => dialogRef.current?.close()}
          className="min-h-11 cursor-pointer rounded-lg border border-field-border
                     px-4 hover:bg-hover disabled:cursor-wait disabled:opacity-60"
        >
          Atšaukti
        </button>

        <button
          type="button"
          disabled={deleting}
          onClick={onConfirm}
          className="min-h-11 cursor-pointer rounded-lg bg-red-700 px-4 font-semibold
                     text-white hover:bg-red-800 disabled:cursor-wait disabled:opacity-60"
        >
          {deleting ? 'Šalinama…' : 'Pašalinti'}
        </button>
      </div>
    </dialog>
  )
}