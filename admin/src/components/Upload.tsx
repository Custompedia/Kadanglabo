import { useRef, useState, type DragEvent, type ReactNode } from 'react'
import { useToasts } from './Toaster'
import { ACCEPT, uploadImage, type Uploaded } from '../lib/image'

/*
 * Drag-and-drop for image files, and the upload queue that goes with it. Files dropped (or picked) are resized and
 * uploaded one after another; each reports its own progress.
 */

export type Job = { key: string; name: string; progress: number; error?: string }

export function useUploads(onDone: (u: Uploaded, file: File) => void) {
  const toasts = useToasts()
  const [jobs, setJobs] = useState<Job[]>([])

  async function add(files: File[]) {
    const list = files.filter((f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|avif|heic)$/i.test(f.name))
    if (!list.length) return
    const queued = list.map((f, i) => ({ key: `${Date.now()}-${i}-${f.name}`, name: f.name, progress: 0, file: f }))
    setJobs((j) => [...j, ...queued.map(({ file: _, ...job }) => job)])
    let ok = 0
    for (const q of queued) {
      try {
        const u = await uploadImage(q.file, (p) => setJobs((j) => j.map((x) => (x.key === q.key ? { ...x, progress: p } : x))))
        onDone(u, q.file)
        ok++
        setJobs((j) => j.filter((x) => x.key !== q.key))
      } catch (e) {
        const msg = (e as Error).message
        setJobs((j) => j.map((x) => (x.key === q.key ? { ...x, error: msg } : x)))
        toasts.add({ title: 'Upload gagal', description: msg, variant: 'error' })
        setTimeout(() => setJobs((j) => j.filter((x) => x.key !== q.key)), 6000)
      }
    }
    if (ok > 1) toasts.add({ title: `${ok} foto terunggah`, variant: 'success' })
  }
  return { jobs, add }
}

/** Wraps any area so image files can be dropped on it; `active` while a file is dragged over. */
export function DropArea({ onFiles, children, className = '', disabled }: { onFiles: (f: File[]) => void; children: (active: boolean, pick: () => void) => ReactNode; className?: string; disabled?: boolean }) {
  const [active, setActive] = useState(false)
  const depth = useRef(0)
  const input = useRef<HTMLInputElement>(null)
  const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer.types).includes('Files')
  return (
    <div
      className={className}
      onDragEnter={(e) => {
        if (disabled || !hasFiles(e)) return
        e.preventDefault()
        depth.current++
        setActive(true)
      }}
      onDragOver={(e) => {
        if (disabled || !hasFiles(e)) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'copy'
      }}
      onDragLeave={() => {
        if (--depth.current <= 0) (depth.current = 0), setActive(false)
      }}
      onDrop={(e) => {
        if (disabled || !hasFiles(e)) return
        e.preventDefault()
        depth.current = 0
        setActive(false)
        onFiles(Array.from(e.dataTransfer.files))
      }}
    >
      {children(active, () => input.current?.click())}
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        multiple
        hidden
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []))
          e.target.value = ''
        }}
      />
    </div>
  )
}

/** The queue under a drop area. */
export function JobList({ jobs }: { jobs: Job[] }) {
  if (!jobs.length) return null
  return (
    <ul className="mt-3 grid gap-2">
      {jobs.map((j) => (
        <li key={j.key} className="rounded-lg bg-kumo-base px-3 py-2 text-xs ring-1 ring-kumo-line">
          <div className="flex justify-between gap-3">
            <span className="truncate text-kumo-default">{j.name}</span>
            <span className={j.error ? 'text-kumo-danger' : 'tabular-nums text-kumo-subtle'}>{j.error ? 'Gagal' : `${Math.round(j.progress * 100)}%`}</span>
          </div>
          {!j.error && (
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-kumo-fill">
              <div className="h-full rounded-full bg-kumo-brand transition-[width] duration-200" style={{ width: `${Math.max(4, j.progress * 100)}%` }} />
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}
