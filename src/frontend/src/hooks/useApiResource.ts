import { useEffect, useState } from 'react'

type Resource<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'error'; statusCode: number | null }

export function useApiResource<T>(url: string, token?: string): Resource<T> {
  const [result, setResult] = useState<{
    url: string
    token?: string
    resource: Resource<T>
  } | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      try {
        const response = await fetch(url, {
          headers: { 
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}) 
            },
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
          setResult({ url, token, resource })
        }
      } catch {
        if (!controller.signal.aborted) {
          setResult({ url, token, resource: { status: 'error', statusCode: null } })
        }
      }
    }

    void load()
    return () => controller.abort()
  }, [url, token])

  if (result && result.url === url && result.token === token) {
    return result.resource
  }

  return { status: 'loading' }
}