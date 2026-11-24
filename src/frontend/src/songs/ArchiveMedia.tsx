import { useState } from 'react'
import type { ReactNode } from 'react'

export function ArchiveNotice({ children }: { children: ReactNode }) {
  return (
    <p
      role="status"
      className="flex items-start gap-2 rounded-lg border border-line bg-page p-3 text-sm text-muted"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        className="mt-0.5 size-4 shrink-0"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v6m0-10v1" />
      </svg>
      <span>{children}</span>
    </p>
  )
}

type ArchiveMediaProps = {
  kind: 'audio' | 'photo'
  src: string
  label: string
}

export function ArchiveMedia({ kind, src, label }: ArchiveMediaProps) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div className="space-y-2">
        <ArchiveNotice>
          {kind === 'audio'
            ? 'Garso įrašo įkelti nepavyko.'
            : 'Pateikėjo nuotraukos įkelti nepavyko.'}
        </ArchiveNotice>
        <button
          type="button"
          onClick={() => setFailed(false)}
          className="rounded px-1 py-2 text-sm font-semibold text-accent underline underline-offset-4 cursor-pointer"
        >
          Bandyti dar kartą
        </button>
      </div>
    )
  }

  if (kind === 'audio') {
    return (
      <audio
        controls
        preload="none"
        src={src}
        aria-label={label}
        onError={() => setFailed(true)}
        className="w-full"
      />
    )
  }

  return (
    <img
      src={src}
      alt={label}
      onError={() => setFailed(true)}
      className="h-auto max-w-full rounded-lg"
    />
  )
}