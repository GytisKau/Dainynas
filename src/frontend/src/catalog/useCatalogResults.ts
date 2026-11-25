import { useEffect, useMemo, useState  } from 'react'

type CatalogState<T> = {
  status: 'loading' | 'ready' | 'error'
  data: T | null
  message?: string
}

async function readCatalogError(response: Response): Promise<string> {
  if (response.status !== 400) {
    return `Nepavyko įkelti katalogo (HTTP ${response.status}).`
  }

  try {
    const problem = await response.json()

    if (typeof problem?.detail === 'string' && problem.detail.trim()) {
      return problem.detail
    }

    if (typeof problem?.title === 'string' && problem.title.trim()) {
      return problem.title
    }
  } catch {
    // API gali grąžinti klaidą be JSON turinio.
  }

  return 'Serveris atmetė paieškos parametrus. Patikrink filtrus.'
}

export function useCatalogResults<T>(
  url: string,
  token?: string,
  revision = 0,
) {
  const [attempt, setAttempt] = useState(0)

  // Pakartotinis bandymas ar sąrašo atnaujinimas yra nauja užklausa net tuo pačiu URL.
  const request = useMemo(
    () => ({ url, token, revision, attempt }),
    [url, token, revision, attempt],
  )

  const [result, setResult] = useState<{
    request: typeof request
    catalog: CatalogState<T>
  } | null>(null)

  const [delayedRequest, setDelayedRequest] = useState<typeof request | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => setDelayedRequest(request), 250)

    async function load() {
      try {
        const response = await fetch(request.url, {
          headers: {
            Accept: 'application/json',
            ...(request.token
              ? { Authorization: `Bearer ${request.token}` }
              : {}),
          },
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(await readCatalogError(response))
        }

        const data: T = await response.json()

        if (!controller.signal.aborted) {
          setResult({ request, catalog: { status: 'ready', data } })
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setResult({
            request,
            catalog: {
              status: 'error',
              data: null,
              message: error instanceof Error
                ? error.message
                : 'Nepavyko įkelti katalogo.',
            },
          })
        }
      } finally {
        window.clearTimeout(timer)
      }
    }

    void load()

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [request])

  // Kol laukiame naujo atsakymo, ekrane lieka ankstesnio atsakymo eilutės.
  const catalog: CatalogState<T> = result?.request === request
    ? result.catalog
    : { status: 'loading', data: result?.catalog.data ?? null }

  const showLoading = catalog.status === 'loading' && delayedRequest === request

  function retry() {
    setAttempt((previous) => previous + 1)
  }

  return { catalog, showLoading, retry }
}