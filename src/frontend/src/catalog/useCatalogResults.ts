import { useEffect, useState } from 'react'

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
  const [catalog, setCatalog] = useState<CatalogState<T>>({
    status: 'loading',
    data: null,
  })
  const [showLoading, setShowLoading] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    setShowLoading(false)
    setCatalog((previous) => ({
      status: 'loading',
      data: previous.data,
    }))

    const timer = window.setTimeout(() => setShowLoading(true), 250)

    async function load() {
      try {
        const response = await fetch(url, {
          headers: {
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(await readCatalogError(response))
        }

        const data: T = await response.json()

        if (!controller.signal.aborted) {
          setCatalog({ status: 'ready', data })
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setCatalog({
            status: 'error',
            data: null,
            message: error instanceof Error
              ? error.message
              : 'Nepavyko įkelti katalogo.',
          })
        }
      } finally {
        window.clearTimeout(timer)
        if (!controller.signal.aborted) setShowLoading(false)
      }
    }

    void load()

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [url, token, attempt, revision])

  function retry() {
    setAttempt((previous) => previous + 1)
  }

  return { catalog, showLoading, retry }
}