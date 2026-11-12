import { useCallback, useEffect, useRef, useState } from 'react'
import { useToasts } from '../components/Toaster'
import { useBlocker, useNavigate } from 'react-router'
import type { RecordState } from '../../../shared/content'
import { api, ApiError } from './api'
import { mutate } from './useFetch'
import type { Kind, Record } from './types'

/*
 * The editing life of one project or article.
 * - Changes stay in the page until "Simpan" (as a draft) or "Publish" (saved and put live). Nothing is saved behind
 *   the user's back.
 * - Leaving with unsaved changes is held: the leave dialog offers to stay, discard, save as draft or save and publish.
 */


export function useRecordEditor<T extends { slug: string }>(kind: Kind, id: string | undefined, blank: () => T) {
  const navigate = useNavigate()
  const toasts = useToasts()
  const base = kind === 'project' ? '/projects' : '/articles'
  const isNew = !id || id === 'new'

  const [draft, setDraftState] = useState<T | null>(isNew ? blank() : null)
  const [meta, setMeta] = useState<Omit<Record<T>, 'draft'> | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [unsaved, setUnsaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [issues, setIssues] = useState<string[]>([])
  const [saveError, setSaveError] = useState<string | null>(null)
  const latest = useRef<T | null>(draft)
  const version = useRef(0)

  useEffect(() => {
    if (isNew) return
    let gone = false
    api<Record<T>>(`${base}/${id}`)
      .then((r) => {
        if (gone) return
        const { draft: d, ...m } = r
        setDraftState(d)
        latest.current = d
        setMeta(m)
        setIssues(r.issues)
        setSavedAt(r.updated_at)
      })
      .catch((e) => !gone && setError(e))
    return () => {
      gone = true
    }
  }, [base, id, isNew])

  const save = useCallback(
    async (opts: { quiet?: boolean } = {}) => {
      const d = latest.current
      if (!d) return false
      const v = version.current
      setSaving(true)
      try {
        if (isNew) {
          const r = await api<{ id: number }>(base, { body: { content: d } })
          setUnsaved(false)
          mutate(base)
          toasts.add({ title: 'Draft tersimpan', description: 'Belum tampil di website sampai ditayangkan.', variant: 'success' })
          navigate(`${base}/${r.id}`, { replace: true })
          return true
        }
        const r = await api<{ updated_at: string; dirty: boolean; issues: string[] }>(`${base}/${id}`, { method: 'PUT', body: { content: d } })
        if (v === version.current) setUnsaved(false)
        setSavedAt(r.updated_at)
        setIssues(r.issues)
        setSaveError(null)
        setMeta((m) => (m ? { ...m, dirty: r.dirty ? 1 : 0, updated_at: r.updated_at } : m))
        mutate(base)
        return true
      } catch (e) {
        const msg = (e as ApiError).message
        setSaveError(msg)
        if (!opts.quiet) toasts.add({ title: 'Belum tersimpan', description: msg, variant: 'error' })
        return false
      } finally {
        setSaving(false)
      }
    },
    [base, id, isNew, navigate, toasts],
  )

  /** Change the draft (a function of the current one); saved when Simpan is pressed. */
  const update = useCallback(
    (fn: (d: T) => T) => {
      setDraftState((d) => {
        if (!d) return d
        const next = fn(d)
        latest.current = next
        return next
      })
      version.current++
      setUnsaved(true)
    },
    [],
  )


  // closing the tab with unsaved work
  useEffect(() => {
    if (!unsaved) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [unsaved])
  // leaving inside the dashboard with unsaved changes: held until the leave dialog decides (LeaveDialog)
  const blocker = useBlocker(({ currentLocation, nextLocation }) => unsaved && currentLocation.pathname !== nextLocation.pathname && !(isNew && nextLocation.pathname.startsWith(`${base}/`)))

  /** Save, then put live. True when it went through (a toast tells what is missing otherwise). */
  const publish = useCallback(async () => {
    if (unsaved && !(await save())) return false
    try {
      const r = await api<{ published_at: string }>(`${base}/${id}/publish`, { method: 'POST' })
      setMeta((m) => (m ? { ...m, state: 'published', published_at: r.published_at, dirty: 0 } : m))
      mutate(base)
      toasts.add({ title: 'Tayang di website', variant: 'success' })
      return true
    } catch (e) {
      toasts.add({ title: 'Belum bisa ditayangkan', description: (e as ApiError).message, variant: 'error' })
      return false
    }
  }, [base, id, save, toasts, unsaved])

  const setState = (state: RecordState, extra: Partial<Record<T>> = {}) => setMeta((m) => (m ? { ...m, state, ...extra } : m))

  return { draft, update, meta, setState, error, unsaved, saving, savedAt, issues, saveError, save, publish, isNew, blocker, base }
}
