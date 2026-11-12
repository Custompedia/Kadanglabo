import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Dialog } from '@cloudflare/kumo'
import { ArrowDown, ArrowRight, ArrowUp, ArrowElbowDownLeft, Buildings, House, ImagesSquare, MagnifyingGlass, MapPinArea, SquaresFour, Newspaper, Plus, UserCircle, UsersThree, type Icon } from '@phosphor-icons/react'
import { useFetch } from '../lib/useFetch'
import { useSession } from '../lib/session'
import { matches } from '../lib/format'
import type { ListItem } from '../lib/types'

/*
 * Ctrl/⌘ K, after Cloudflare's quick search: recently opened items first, then everything grouped (projects,
 * articles, pages) as "Name — kind", the current row marked with an arrow, keyboard hints at the bottom.
 */

type Hit = { key: string; label: string; kind: string; to: string; icon: Icon }
type Group = { title: string; hits: Hit[] }

const RECENT_KEY = 'kl-admin-recent'
const readRecent = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
  } catch {
    return []
  }
}
/** Remember an opened project or article (its path), newest first. */
function remember(path: string) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify([path, ...readRecent().filter((p) => p !== path)].slice(0, 6)))
  } catch {
    /* private mode */
  }
}

export function SearchPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user } = useSession()
  const [q, setQ] = useState('')
  const [at, setAt] = useState(0)
  const list = useRef<HTMLDivElement>(null)
  const projects = useFetch<{ items: ListItem[] }>(open ? '/projects' : null)
  const articles = useFetch<{ items: ListItem[] }>(open ? '/articles' : null)

  // every project or article opened counts as recent
  useEffect(() => {
    if (/^\/(projects|articles)\/\d+$/.test(pathname)) remember(pathname)
  }, [pathname])

  useEffect(() => {
    if (open) (setQ(''), setAt(0))
  }, [open])

  const groups = useMemo<Group[]>(() => {
    const pages: Hit[] = [
      { key: 'p:/', label: 'Ringkasan', kind: 'Halaman', to: '/', icon: House },
      { key: 'p:/projects', label: 'Projek', kind: 'Konten', to: '/projects', icon: Buildings },
      { key: 'p:/projects/new', label: 'Projek baru', kind: 'Buat', to: '/projects/new', icon: Plus },
      { key: 'p:/articles', label: 'Artikel', kind: 'Konten', to: '/articles', icon: Newspaper },
      { key: 'p:/articles/new', label: 'Artikel baru', kind: 'Buat', to: '/articles/new', icon: Plus },
      { key: 'p:/media', label: 'Media', kind: 'Konten', to: '/media', icon: ImagesSquare },
      { key: 'p:/pages/work', label: 'Our Work', kind: 'Halaman website', to: '/pages/work', icon: SquaresFour },
      { key: 'p:/pages/commercial', label: 'Commercial', kind: 'Halaman website', to: '/pages/commercial', icon: SquaresFour },
      { key: 'p:/pages/hospitality', label: 'Hospitality', kind: 'Halaman website', to: '/pages/hospitality', icon: SquaresFour },
      { key: 'p:/pages/residential', label: 'Residential', kind: 'Halaman website', to: '/pages/residential', icon: SquaresFour },
      { key: 'p:/locations', label: 'Lokasi', kind: 'Halaman website', to: '/locations', icon: MapPinArea },
      ...(user?.role === 'admin' ? [{ key: 'p:/users', label: 'Pengguna', kind: 'Akun', to: '/users', icon: UsersThree }] : []),
      { key: 'p:/profile', label: 'Profil & password', kind: 'Akun', to: '/profile', icon: UserCircle },
    ]
    const live = (i: ListItem) => i.state !== 'trashed'
    const proj: Hit[] = (projects.data?.items ?? []).filter(live).map((p) => ({ key: `/projects/${p.id}`, label: p.title, kind: p.archive_only ? 'Arsip' : 'Projek', to: `/projects/${p.id}`, icon: Buildings }))
    const art: Hit[] = (articles.data?.items ?? []).filter(live).map((a) => ({ key: `/articles/${a.id}`, label: a.title, kind: 'Artikel', to: `/articles/${a.id}`, icon: Newspaper }))

    if (!q.trim()) {
      const all = new Map([...proj, ...art].map((h) => [h.to, h]))
      const recent = readRecent().map((p) => all.get(p)).filter((h): h is Hit => !!h)
      return [
        ...(recent.length ? [{ title: 'Terakhir dibuka', hits: recent }] : []),
        { title: 'Halaman', hits: pages },
      ]
    }
    const f = (hits: Hit[], n: number) => hits.filter((h) => matches(`${h.label} ${h.kind}`, q)).slice(0, n)
    return [
      { title: 'Projek', hits: f(proj, 8) },
      { title: 'Artikel', hits: f(art, 6) },
      { title: 'Halaman', hits: f(pages, 8) },
    ].filter((g) => g.hits.length)
  }, [q, projects.data, articles.data, user])

  const flat = groups.flatMap((g) => g.hits)
  useEffect(() => {
    setAt(0)
  }, [q])
  // (a block, not an expression: scrollIntoView returns a promise in newer browsers, and an effect may only return a cleanup)
  useEffect(() => {
    list.current?.querySelector(`[data-i="${at}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [at])

  const go = (h: Hit | undefined) => {
    if (!h) return
    onOpenChange(false)
    navigate(h.to)
  }

  let n = -1
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog size="lg" className="w-[min(680px,94vw)] max-w-none overflow-hidden p-0">
        <Dialog.Title className="sr-only">Cari cepat</Dialog.Title>
        <div className="flex items-center gap-3 border-b border-kumo-hairline px-5">
          <MagnifyingGlass size={20} className="shrink-0 text-kumo-subtle" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') (e.preventDefault(), setAt((i) => Math.min(flat.length - 1, i + 1)))
              if (e.key === 'ArrowUp') (e.preventDefault(), setAt((i) => Math.max(0, i - 1)))
              if (e.key === 'Enter') (e.preventDefault(), go(flat[at]))
            }}
            placeholder="Cari projek, artikel, dan halaman…"
            className="h-16 flex-1 bg-transparent text-[16px] outline-none placeholder:text-kumo-placeholder"
          />
          <kbd className="rounded-md border border-kumo-line px-1.5 py-0.5 font-sans text-xs text-kumo-subtle">Esc</kbd>
        </div>

        <div ref={list} className="max-h-[min(56vh,420px)] overflow-y-auto px-2 py-2" role="listbox">
          {flat.length === 0 && <p className="px-3 py-12 text-center text-sm text-kumo-subtle">Tidak ada yang cocok dengan “{q}”.</p>}
          {groups.map((g) => (
            <div key={g.title} className="mb-1">
              <p className="px-3 pb-1 pt-2.5 text-[13px] font-medium text-kumo-subtle">{g.title}</p>
              {g.hits.map((h) => {
                const i = ++n
                const on = i === at
                return (
                  <button
                    key={`${g.title}${h.key}`}
                    data-i={i}
                    role="option"
                    aria-selected={on}
                    onMouseMove={() => setAt(i)}
                    onClick={() => go(h)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[15px] ${on ? 'bg-kumo-tint' : ''}`}
                  >
                    <h.icon size={18} className="shrink-0 text-kumo-subtle" />
                    <span className="min-w-0 truncate text-kumo-strong">{h.label}</span>
                    <span className="shrink-0 text-kumo-subtle">— {h.kind}</span>
                    <span className="flex-1" />
                    {on && <ArrowRight size={16} className="shrink-0 text-kumo-subtle" />}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 border-t border-kumo-hairline bg-kumo-recessed/60 px-5 py-3 text-[13px] text-kumo-subtle">
          <span className="flex items-center gap-1.5">
            <Key><ArrowUp size={12} /></Key>
            <Key><ArrowDown size={12} /></Key>
            untuk pindah
          </span>
          <span className="flex items-center gap-1.5">
            <Key><ArrowElbowDownLeft size={12} /></Key>
            untuk membuka
          </span>
        </div>
      </Dialog>
    </Dialog.Root>
  )
}

const Key = ({ children }: { children: React.ReactNode }) => (
  <kbd className="grid size-6 place-items-center rounded-md border border-kumo-line bg-kumo-base text-kumo-default">{children}</kbd>
)
