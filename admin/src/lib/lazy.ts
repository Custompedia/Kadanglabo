import { lazy, type ComponentType } from 'react'

/*
 * A page loaded on demand. After a new deploy (or a code change in development) the old file names are gone, and
 * the browser still holding the old app cannot fetch them: then reload once, so the page simply opens in the new
 * version instead of showing an error.
 */
const KEY = 'kl-admin-reloaded'

export const isStaleChunk = (e: unknown) => /dynamically imported module|Importing a module script failed|error loading dynamically/i.test(String((e as Error)?.message ?? e))

export function reloadOnce() {
  try {
    if (sessionStorage.getItem(KEY)) return false
    sessionStorage.setItem(KEY, '1')
  } catch {
    /* private mode: reload anyway */
  }
  location.reload()
  return true
}
// a successful start clears the flag, so the next deploy can reload again
setTimeout(() => {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}, 10_000)

export function lazyPage<T extends ComponentType<object>>(load: () => Promise<{ default: T }>) {
  return lazy(() =>
    load().catch((e) => {
      if (isStaleChunk(e) && reloadOnce()) return new Promise<{ default: T }>(() => {}) // the reload takes over
      throw e
    }),
  )
}
