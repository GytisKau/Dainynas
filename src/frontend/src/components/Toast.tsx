import { useEffect } from 'react'

type ToastProps = {
  message: string
  onDismiss: () => void
}

export default function Toast({ message, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!message) return

    const timer = window.setTimeout(onDismiss, 5000)
    return () => window.clearTimeout(timer)
  }, [message, onDismiss])

  // Čia grąžink esamą role="status" bloką iš PerformerDialog.tsx.

  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-50
                sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-96"
    >
      {message && (
        <div
          className="flex items-start gap-3 rounded-xl border border-line
                    bg-surface px-4 py-3 text-ink shadow-lg"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mt-0.5 size-5 shrink-0 text-accent"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="m8 12 3 3 5-6" />
          </svg>

          <p className="wrap-anywhere text-sm font-medium">{message}</p>
        </div>
      )}
    </div>
  )
}