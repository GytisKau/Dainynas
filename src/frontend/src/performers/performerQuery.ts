export type View = 'public' | 'mine'

export type Search = {
  view: View
  name: string
  page: number
}

export function readSearch(params: URLSearchParams): Search | string {
  const seen = new Set<string>()

  for (const key of params.keys()) {
    if (!['rodinys', 'name', 'page'].includes(key)) {
      return `Nežinomas pateikėjų katalogo parametras „${key}“.`
    }
    if (seen.has(key)) {
      return `Parametras „${key}“ nuorodoje pakartotas.`
    }
    seen.add(key)
  }

  const viewParam = params.get('rodinys')
  if (viewParam !== null && viewParam !== 'mano') {
    return 'Nežinomas katalogo rodinys.'
  }

  const rawPage = params.get('page') ?? '1'
  if (!/^[1-9]\d*$/.test(rawPage) || Number(rawPage) > 2147483647) {
    return 'Puslapio numeris turi būti teigiamas sveikasis skaičius iki 2147483647.'
  }

  if (viewParam === 'mano' && params.has('name')) {
    return 'Paieška pagal vardą galima viešame kataloge.'
  }

  return {
    view: viewParam === 'mano' ? 'mine' : 'public',
    name: params.get('name')?.trim() ?? '',
    page: Number(rawPage),
  }
}