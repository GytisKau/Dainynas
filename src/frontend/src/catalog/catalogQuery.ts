import type { SongSearch } from "../songs/catalog/types";


type ParsedQuery =
  | { ok: true; search: SongSearch }
  | { ok: false; message: string }

const allowed = new Set(['title', 'year', 'performerId', 'page', 'pageSize'])

function isInt32(value: string) {
  if (!/^-?(0|[1-9]\d*)$/.test(value)) return false

  const number = Number(value)
  return number >= -2147483648 && number <= 2147483647
}

export function parseCatalogQuery(
  params: URLSearchParams, 
  allowedKeys: ReadonlySet<string> = allowed
): ParsedQuery {
  const seen = new Set<string>()

  for (const [key, value] of params) {
    if (!allowedKeys.has(key)) {
      return { ok: false, message: `Nežinomas katalogo parametras „${key}“.` }
    }

    if (seen.has(key)) {
      return { ok: false, message: `Parametras „${key}“ nuorodoje pakartotas.` }
    }
    seen.add(key)

    if (key !== 'title' && !isInt32(value)) {
      return { ok: false, message: `Parametro „${key}“ reikšmė turi būti sveikasis skaičius.` }
    }

    if ((key === 'page' || key === 'pageSize') && Number(value) < 1) {
      return { ok: false, message: `Parametro „${key}“ reikšmė turi būti bent 1.` }
    }
  }

  return {
    ok: true,
    search: {
      title: params.get('title')?.trim() ?? '',
      year: params.get('year') ?? '',
      performerId: params.get('performerId') ?? '',
      page: Number(params.get('page') ?? '1'),
      pageSize: Number(params.get('pageSize') ?? '10'),
    },
  }
}

export function toCatalogParams(search: SongSearch) {
  const params = new URLSearchParams()

  if (search.title) params.set('title', search.title)
  if (search.year) params.set('year', search.year)
  if (search.performerId) params.set('performerId', search.performerId)
  if (search.page !== 1) params.set('page', String(search.page))
  if (search.pageSize !== 10) params.set('pageSize', String(search.pageSize))

  return params
}

const mySongKeys = new Set(['page', 'pageSize'])

export function readSongCatalogQuery(params: URLSearchParams) {
  const views = params.getAll('rodinys')

  if (views.length > 1) {
    return { ok: false, message: 'Parametras „rodinys“ nuorodoje pakartotas.' } as const
  }

  if (views.length === 1 && views[0] !== 'mano') {
    return { ok: false, message: 'Nežinomas dainų katalogo rodinys.' } as const
  }

  const mine = views[0] === 'mano'
  const filters = new URLSearchParams(params)
  filters.delete('rodinys')

  if (mine && ['title', 'year', 'performerId'].some((key) => filters.has(key))) {
    return {
      ok: false,
      message: 'Filtrai pagal pavadinimą, metus ir pateikėją galimi viešų dainų rodinyje.',
    } as const
  }

  const parsed = parseCatalogQuery(filters, mine ? mySongKeys : undefined)
  if (!parsed.ok) return parsed

  return { ok: true, mine, search: parsed.search } as const
}