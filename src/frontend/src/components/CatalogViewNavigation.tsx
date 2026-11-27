import { Link } from 'react-router'

type View = 'public' | 'mine'

type Props = {
  view: View
  publicLabel?: string
} & (
  | { path: string; onViewChange?: never }
  | { path?: never; onViewChange: (view: View) => void }
)

export default function CatalogViewNavigation(props: Props) {
  const options = [
    { view: 'public', label: props.publicLabel ?? 'Vieši' },
    { view: 'mine', label: 'Mano' },
  ] as const

  const items = options.map(({ view, label }) => {
    const active = props.view === view
    const className = `inline-flex min-h-11 cursor-pointer items-center rounded-lg px-4 text-sm ${
      active
        ? 'bg-surface font-semibold text-accent dark:bg-white dark:text-neutral-900'
        : 'text-muted hover:bg-hover hover:text-ink'
    }`

    if (props.onViewChange) {
      return (
        <button
          key={view}
          type="button"
          aria-pressed={active}
          className={className}
          onClick={() => props.onViewChange?.(view)}
        >
          {label}
        </button>
      )
    }

    return (
      <Link
        key={view}
        to={view === 'mine' ? `${props.path}?rodinys=mano` : props.path}
        aria-current={active ? 'page' : undefined}
        className={className}
      >
        {label}
      </Link>
    )
  })

  const group = (
    <div className="inline-flex gap-1 rounded-xl border border-line bg-chrome p-1">
      {items}
    </div>
  )

  return props.onViewChange ? (
    <div role="group" aria-label="Dainų šaltinis">{group}</div>
  ) : (
    <nav aria-label="Katalogo rodinys" className="mb-4">{group}</nav>
  )
}