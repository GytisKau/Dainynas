type PaginationProps = {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  // Rodome iki trijų gretimų numerių, kad jie tilptų telefone.
  const first = Math.max(1, Math.min(page - 1, totalPages - 2))
  const last = Math.min(first + 2, totalPages)
  const pages = Array.from({ length: last - first + 1 }, (_, i) => first + i)

  const buttonClass =
    'min-h-11 min-w-11 rounded-lg border border-transparent px-2 ' +
    'transition-colors enabled:hover:bg-hover ' +
    'disabled:cursor-default disabled:opacity-30'

  return (
    <nav
      aria-label="Rezultatų puslapiai"
      className="mt-4 flex flex-wrap items-center justify-center gap-1"
    >
      <button
        type="button"
        aria-label="Ankstesnis puslapis"
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
        className={buttonClass}
      >
        ‹
      </button>

      {first > 1 && <span aria-hidden="true">…</span>}

      {pages.map((number) => (
        <button
          key={number}
          type="button"
          aria-label={`${number} puslapis`}
          aria-current={number === page ? 'page' : undefined}
          onClick={() => {
            if (number !== page) onPageChange(number)
          }}
          className={`${buttonClass} aria-[current=page]:border-field-border aria-[current=page]:bg-hover`}
        >
          {number}
        </button>
      ))}

      {last < totalPages && <span aria-hidden="true">…</span>}

      <button
        type="button"
        aria-label="Kitas puslapis"
        disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}
        className={buttonClass}
      >
        ›
      </button>
    </nav>
  )
}