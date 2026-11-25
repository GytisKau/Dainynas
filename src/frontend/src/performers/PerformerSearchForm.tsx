import { useState } from "react"
import type { SubmitEvent } from 'react'

type SearchFormProps = {
  initialName: string
  onSearch: (name: string) => void
}

export default function PerformerSearchForm({ initialName, onSearch }: SearchFormProps) {
  const [name, setName] = useState(initialName)

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    onSearch(name.trim())
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid max-full grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-1"
    >
      <label htmlFor="performer-name-search" className="col-span-2">
        Vardas arba pavardė
      </label>
      <input
        id="performer-name-search"
        type="search"
        value={name}
        onChange={(event) => setName(event.target.value)}
        className="min-h-11 min-w-0 rounded-lg border border-field-border bg-field px-3 text-ink"
      />
      <button
        type="submit"
        className="min-h-11 rounded-lg bg-accent px-4 font-semibold text-on-accent transition-colors hover:bg-accent-hover"
      >
        Ieškoti
      </button>
    </form>
  )
}