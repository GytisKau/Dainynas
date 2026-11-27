import { useId, useRef } from 'react'
import type { KeyboardEvent } from 'react'

const iconPaths = {
  edit: 'M4 20l4.5-1 11-11a2.5 2.5 0 0 0-3.5-3.5l-11 11L4 20Z M14.5 6l3.5 3.5',
  submit: 'M21 3 3 10l7 3 3 8 8-18Z M10 13 21 3',
  unpublish: 'M4 10h10a6 6 0 0 1 0 12 M4 10l5-5 M4 10l5 5',
  delete: 'M3 6h18 M9 6V3h6v3 M6 6l1 15h10l1-15 M10 10v7 M14 10v7',
  moveUp: 'M12 19V5 M6 11l6-6 6 6',
  moveDown: 'M12 5v14 M6 13l6 6 6-6',
}

export type RowAction = {
  icon: keyof typeof iconPaths
  label: string
  onSelect: () => void
}

type Props = {
  label: string
  actions: RowAction[]
  disabled?: boolean
}

export default function RowActions({ label, actions, disabled = false }: Props) {
  const menuId = useId()
  const triggerId = useId()
  const trigger = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)

  function closeMenu() {
    trigger.current?.focus()
    menu.current?.hidePopover()
  }

  function handleKeys(event: KeyboardEvent<HTMLDivElement>) {
    const buttons = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'),
    )
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement)

    if (event.key === 'Tab') {
      // Iš čia naršyklė tęs Tab arba Shift+Tab nuo eilutės mygtuko.
      closeMenu()
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      closeMenu()
      return
    }

    let next: number
    switch (event.key) {
      case 'ArrowDown': next = (index + 1) % buttons.length; break
      case 'ArrowUp': next = (index - 1 + buttons.length) % buttons.length; break
      case 'Home': next = 0; break
      case 'End': next = buttons.length - 1; break
      default: return
    }

    event.preventDefault()
    buttons[next]?.focus()
  }

  const supportsAnchoredPopover =
    'showPopover' in HTMLElement.prototype &&
    CSS.supports('position-area', 'block-end span-inline-start')

  function renderAction(action: RowAction, inMenu: boolean) {
    return (
      <button
        key={action.icon}
        type="button"
        role={inMenu ? 'menuitem' : undefined}
        tabIndex={inMenu ? -1 : undefined}
        disabled={disabled}
        onClick={() => {
          if (inMenu) closeMenu()
          action.onSelect()
        }}
        className="flex min-h-11 w-full items-center gap-3 rounded-md px-3
                   text-left text-sm font-medium text-ink transition-colors
                   hover:bg-hover focus-visible:bg-hover
                   focus-visible:-outline-offset-2 disabled:opacity-60
                   cursor-pointer disabled:cursor-not-allowed"
      >
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
          <path d={iconPaths[action.icon]} />
        </svg>
        {action.label}
      </button>
    )
  }

  // Senesnėje naršyklėje visi veiksmai lieka pasiekiami tiesiog eilutėje.
  if (!supportsAnchoredPopover) {
    return (
      <div className="flex flex-wrap gap-1">
        {actions.map((action) => (
          <div key={action.icon}>{renderAction(action, false)}</div>
        ))}
      </div>
    )
  }

  return (
    <>
      <button
        ref={trigger}
        id={triggerId}
        type="button"
        popoverTarget={menuId}
        aria-haspopup="menu"
        aria-label={label}
        disabled={disabled}
        className="grid size-11 shrink-0 place-items-center rounded-lg text-ink
                   hover:bg-hover focus-visible:bg-hover disabled:opacity-60
                   cursor-pointer disabled:cursor-not-allowed"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="size-5">
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>

      <div
        ref={menu}
        id={menuId}
        popover="auto"
        role="menu"
        aria-labelledby={triggerId}
        onKeyDown={handleKeys}
        onToggle={(event) => {
          if (event.newState === 'open') {
            event.currentTarget.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus()
          }
        }}
        className="row-actions-popover rounded-xl border border-line bg-surface p-1 text-ink shadow-lg"
      >
        {actions.map((action) => renderAction(action, true))}
      </div>
    </>
  )
}