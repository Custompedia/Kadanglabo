import { useCallback, useEffect, useRef, useState } from 'react'
import { api, ApiError } from './api'

/*
 * GET a path and keep it fresh. Results are cached per path for the session, so moving between pages shows the
 * last data at once while it reloads in the background. `mutate()` from anywhere refreshes every user of a path.
 */

const cache = new Map<string, unknown>()
const listeners = new Map<string, Set<() => void>>()

export function mutate(path: string) {
  cache.delete(path)
  listeners.get(path)?.forEach((fn) => fn())
}

export function useFetch<T>(path: string | null) {
  const [data, setData] = useState<T | undefined>(() => (path ? (cache.get(path) as T | undefined) : undefined))
  const [error, setError] = useState<ApiError | null>(null)
  const [loading, setLoading] = useState(!!path && !cache.has(path))
  const seq = useRef(0)

  const load = useCallback(async () => {
    if (!path) return
    const n = ++seq.current
    setLoading(true)
    try {
      const r = await api<T>(path)
      if (n !== seq.current) return
      cache.set(path, r)
      setData(r)
      setError(null)
    } catch (e) {
      if (n === seq.current) setError(e as ApiError)
    } finally {
      if (n === seq.current) setLoading(false)
    }
  }, [path])

  useEffect(() => {
    if (!path) return
    setData(cache.get(path) as T | undefined)
    void load()
    let set = listeners.get(path)
    if (!set) listeners.set(path, (set = new Set()))
    set.add(load)
    return () => void set.delete(load)
  }, [path, load])

  return { data, error, loading, reload: load, setData }
}
