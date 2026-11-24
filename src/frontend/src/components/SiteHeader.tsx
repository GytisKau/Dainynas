import { useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Link, useLocation } from 'react-router'

const sections = [
  {
    label: 'Dainos',
    to: '/',
    detailPath: '/dainos/',
    icon: 'M9 18V5l11-2v13 M9 8l11-2 M9 18a3 2 0 1 1-6 0 3 2 0 1 1 6 0 M20 16a3 2 0 1 1-6 0 3 2 0 1 1 6 0',
  },
  {
    label: 'Pateikėjai',
    to: '/pateikejai',
    detailPath: '/pateikejai/',
    icon: 'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M14 7a4 4 0 1 1-8 0 4 4 0 1 1 8 0 M20 21v-2a4 4 0 0 0-3-3.87',
  },
  {
    label: 'Albumai',
    to: '/albumai',
    detailPath: '/albumai/',
    icon: 'M4 5h14a2 2 0 0 1 2 2v13H6a2 2 0 0 1-2-2V5Z M4 16h16 M8 5v11',
  },
]

function Icon({ path }: { path: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5 shrink-0"
    >
      <path d={path} />
    </svg>
  )
}

export default function SiteHeader() {
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape' && menuOpen) {
      setMenuOpen(false)
      toggleRef.current?.focus()
    }
  }

  return (
    <header className="border-b border-line bg-chrome" onKeyDown={handleKeyDown}>
      <div className="mx-auto grid w-full max-w-308 grid-cols-[1fr_auto] items-center gap-x-4 px-4 py-2 md:grid-cols-[1fr_auto_1fr]">
        <Link
          to="/"
          onClick={() => setMenuOpen(false)}
          className="w-fit rounded py-2 text-lg font-semibold text-ink"
        >
          Dainynas
        </Link>

        <button
          ref={toggleRef}
          type="button"
          aria-label={menuOpen ? 'Užverti meniu' : 'Atverti meniu'}
          aria-expanded={menuOpen}
          aria-controls="site-navigation"
          onClick={() => setMenuOpen((open) => !open)}
          className="grid size-11 place-items-center rounded-lg text-ink hover:bg-hover md:hidden"
        >
          <Icon path={menuOpen ? 'M6 6l12 12 M18 6 6 18' : 'M3 6h18 M3 12h18 M3 18h18'} />
        </button>

        <nav
          id="site-navigation"
          aria-label="Pagrindinė navigacija"
          className={`col-span-2 py-2 md:col-span-1 md:col-start-2 md:block md:py-0 ${
            menuOpen ? 'block' : 'hidden'
          }`}
        >
          <ul className="flex flex-col gap-1 md:flex-row md:rounded-xl md:bg-page md:p-1">
            {sections.map(({ label, to, detailPath, icon }) => {
              const currentPage = pathname === to
              const active = currentPage || pathname.startsWith(detailPath)

              return (
                <li key={to}>
                  <Link
                    to={to}
                    aria-current={currentPage ? 'page' : active ? 'location' : undefined}
                    onClick={() => setMenuOpen(false)}
                    className={`flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm transition-colors ${
                      active
                        ? 'bg-surface font-semibold text-accent dark:bg-white dark:text-neutral-900'
                        : 'text-muted hover:bg-hover hover:text-ink'
                    }`}
                  >
                    <Icon path={icon} />
                    {label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </header>
  )
}