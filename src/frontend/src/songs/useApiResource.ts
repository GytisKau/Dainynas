import { useEffect, useState } from 'react'

type Resource<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'error'; statusCode: number | null }

export function useApiResource<T>(url: string): Resource<T> {
  const [result, setResult] = useState<{
    url: string
    resource: Resource<T>
  } | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      try {
        const response = await fetch(url, {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        })

        let resource: Resource<T>

        if (response.ok) {
          const data: T = await response.json()
          resource = { status: 'ready', data }
        } else {
          resource = { status: 'error', statusCode: response.status }
        }

        if (!controller.signal.aborted) {
          setResult({ url, resource })
        }
      } catch {
        if (!controller.signal.aborted) {
          setResult({ url, resource: { status: 'error', statusCode: null } })
        }
      }
    }

    void load()
    return () => controller.abort()
  }, [url])

  if (result?.url === url) return result.resource
  return { status: 'loading' }
}