import { Link } from 'react-router'

type Props = {
  path: string
  view: 'public' | 'mine'
}

export default function CatalogViewNavigation({ path, view }: Props) {
  const options = [
    { view: 'public', label: 'Vieši', to: path },
    { view: 'mine', label: 'Mano', to: `${path}?rodinys=mano` },
  ] as const

  return (
    <nav aria-label="Katalogo rodinys" className="mb-4">
      <div className="inline-flex gap-1 rounded-xl border border-line bg-chrome p-1">
        {options.map((option) => {
          const active = option.view === view

          return (
            <Link
              key={option.view}
              to={option.to}
              aria-current={active ? 'page' : undefined}
              className={`inline-flex min-h-11 items-center rounded-lg px-4 text-sm ${
                active
                  ? 'bg-surface font-semibold text-accent dark:bg-white dark:text-neutral-900'
                  : 'text-muted hover:bg-hover hover:text-ink'
              }`}
            >
              {option.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}