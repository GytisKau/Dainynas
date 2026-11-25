import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ToastContext, type Notify, type ToastKind } from './useToast'

type Notice = {
  id: number
  kind: ToastKind
  message: string
}

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<Notice[]>([])
  const nextId = useRef(0)
  const current = queue[0]

  const notify = useCallback<Notify>((kind, message) => {
    const notice = { id: ++nextId.current, kind, message }
    setQueue((previous) => [...previous, notice])
  }, [])

  const dismiss = useCallback((id: number) => {
    setQueue((previous) => previous.filter((notice) => notice.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={notify}>
      {children}

      <section aria-label="Pranešimai">
        <div role="status" className="sr-only">
          {current && <span key={current.id}>{current.message}</span>}
        </div>

        {current && (
          <ToastCard key={current.id} notice={current} onDismiss={dismiss} />
        )}
      </section>
    </ToastContext.Provider>
  )
}

function ToastIcon({ kind }: { kind: ToastKind }) {
  const success = kind === 'success'

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`size-5 shrink-0 ${
        success ? 'text-accent' : 'text-red-700 dark:text-red-400'
      }`}
    >
      {success ? (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="m8 12 2.5 2.5L16 9" />
        </>
      ) : (
        <>
          <path d="M12 3 2 20h20L12 3Z" />
          <path d="M12 9v4" />
          <circle cx="12" cy="16.5" r="1" fill="currentColor" stroke="none" />
        </>
      )}
    </svg>
  )
}

type ToastCardProps = {
  notice: Notice
  onDismiss: (id: number) => void
}

function ToastCard({ notice, onDismiss }: ToastCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    const card = cardRef.current
    if (!card) return

    // Senesnėje naršyklėje pranešimą toje pačioje vietoje parodo fixed stiliai.
    if (typeof card.showPopover === 'function') {
      card.showPopover()
      return () => card.hidePopover()
    }
  }, [])

  useEffect(() => {
    if (notice.kind === 'error' || hovered || focused) return

    const timer = window.setTimeout(() => onDismiss(notice.id), 5000)
    return () => window.clearTimeout(timer)
  }, [notice.id, notice.kind, hovered, focused, onDismiss])

  function close() {
    const target = previousFocus.current

    if (cardRef.current?.contains(document.activeElement)) {
      if (target?.isConnected) {
        target.focus()
      } else {
        document.querySelector<HTMLElement>('header a[href]')?.focus()
      }
    }

    onDismiss(notice.id)
  }

  return (
    <div
      ref={cardRef}
      popover="manual"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={(event) => {
        setFocused(true)
        if (event.relatedTarget instanceof HTMLElement) {
          previousFocus.current = event.relatedTarget
        }
      }}
      onBlur={() => setFocused(false)}
      className="fixed inset-auto right-4 bottom-4 left-4 z-50 m-0 w-auto
                 rounded-xl border border-line bg-surface p-4 text-ink shadow-lg
                 sm:right-6 sm:bottom-6 sm:left-auto sm:w-96"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <ToastIcon kind={notice.kind} />
            {notice.kind === 'success' ? 'Atlikta' : 'Nepavyko'}
          </p>
          <p className="mt-1 wrap-anywhere text-sm">{notice.message}</p>
        </div>

        <button
          type="button"
          aria-label="Užverti pranešimą"
          onClick={close}
          className="grid size-11 shrink-0 place-items-center rounded-lg
                     text-xl text-muted hover:bg-hover hover:text-ink"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </div>
  )
}