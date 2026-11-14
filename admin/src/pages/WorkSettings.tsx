import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router'
import { Loader } from '@cloudflare/kumo'
import { ArrowSquareOut } from '@phosphor-icons/react'
import { CATEGORY_SELECTED_MAX, WORK_HIGHLIGHT_MAX, categories, categoryLabel, type Category, type PageSettings } from '../../../shared/content'
import { AsideSection, Page } from '../layout/Page'
import { PUBLIC_SITE } from '../layout/Shell'
import { api, ApiError } from '../lib/api'
import { mutate, useFetch } from '../lib/useFetch'
import { ago } from '../lib/format'
import type { ListItem } from '../lib/types'
import { useToasts } from '../components/Toaster'
import { Section } from '../components/Fields'
import { ImageSlot } from '../components/ImageSlot'
import { SuggestContext } from '../components/MediaPicker'
import { ProjectPicker } from '../components/ProjectPicker'
import { SaveBar } from '../components/SaveBar'

/*
 * The website's own pages, one dashboard page each (sidebar › Halaman website):
 *   /pages/work                 the Our Work page: which projects each category band shows
 *   /pages/commercial (…)       a category page: its hero photo and its chosen projects
 * Everything else on those pages fills itself in. Saving is live at once.
 */

const title: Record<Category, string> = { commercial: 'Commercial Design', hospitality: 'Hospitality Design', residential: 'Selected Residential Design' }

type Data = { pages: PageSettings; updated_by: string | null; updated_at: string | null }

export default function WorkSettings() {
  const { view = 'work' } = useParams()
  const toasts = useToasts()
  const { data, reload } = useFetch<Data>('/pages')
  const projects = useFetch<{ items: ListItem[] }>('/projects')
  const [draft, setDraft] = useState<PageSettings | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (data && !draft) setDraft(structuredClone(data.pages))
  }, [data, draft])

  const dirty = !!draft && !!data && JSON.stringify(draft) !== JSON.stringify(data.pages)
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  if (view !== 'work' && !categories.includes(view as Category)) return <Navigate to="/pages/work" replace />

  async function save() {
    if (!draft) return
    setSaving(true)
    try {
      await api('/pages', { method: 'PUT', body: { pages: draft } })
      await reload()
      setDraft(null) // picks up the saved copy
      mutate('/pages')
      toasts.add({ title: 'Tersimpan dan tayang', description: 'Website sudah memakai pengaturan ini.', variant: 'success' })
    } catch (e) {
      toasts.add({ title: 'Belum tersimpan', description: (e as ApiError).message, variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  if (!draft || !projects.data)
    return (
      <div className="grid place-items-center py-32">
        <Loader size="lg" />
      </div>
    )

  const set = (cat: Category, patch: Partial<PageSettings['categories'][Category]>) =>
    setDraft({ categories: { ...draft.categories, [cat]: { ...draft.categories[cat], ...patch } } })
  const live = (cat: Category) => projects.data!.items.filter((p) => p.category === cat && p.state === 'published').map((p) => ({ ...p, slug: p.published_slug || p.slug }))
  const pickable = (cat: Category) => live(cat).filter((p) => !p.archive_only)

  const saveBar = (
    <SaveBar
      dirty={dirty}
      saving={saving}
      onSave={() => void save()}
      onUndo={() => data && setDraft(structuredClone(data.pages))}
      saved={data?.updated_at ? `Disimpan ${ago(data.updated_at)}${data.updated_by && data.updated_by !== 'seed' ? ` oleh ${data.updated_by}` : ''}` : undefined}
    />
  )

  /* ---- Our Work ---------------------------------------------------------------------------------------------- */
  if (view === 'work')
    return (
      <Page
        wide
        title="Our Work"
        pill={<SiteLink path="/work" />}
        description="Halaman Our Work punya satu bagian untuk setiap kategori. Pilih projek yang tampil di tiap bagian; fotonya memakai cover projek."
        aside={<PageMap page="work" />}
      >
        <div className="grid max-w-[960px] gap-6 min-[1600px]:max-w-none">
          {categories.map((cat, i) => (
            <Section
              key={cat}
              n={i + 1}
              title={title[cat]}
              description={`Maksimal ${WORK_HIGHLIGHT_MAX} projek, tampil berurutan seperti di daftar ini.`}
              where={`Our Work › bagian ${title[cat]}`}
              href={`${PUBLIC_SITE}/work#${cat}`}
            >
              <ProjectPicker value={draft.categories[cat].highlight} onChange={(highlight) => set(cat, { highlight })} options={pickable(cat)} max={WORK_HIGHLIGHT_MAX} />
              <p className="text-sm text-kumo-subtle">
                Di bawah judul bagian ini tertulis <b className="text-kumo-default">{live(cat).length} projek</b>, dihitung otomatis dari semua projek {categoryLabel[cat]} yang tayang.
              </p>
            </Section>
          ))}
        </div>
        {saveBar}
      </Page>
    )

  /* ---- a category page ----------------------------------------------------------------------------------------- */
  const cat = view as Category
  const s = draft.categories[cat]
  return (
    <Page
      wide
      title={categoryLabel[cat]}
      pill={<SiteLink path={`/work/${cat}`} />}
      description={`Halaman khusus ${title[cat]}. Atur foto paling atas dan projek yang diceritakan di halaman ini.`}
      aside={<PageMap page={cat} />}
    >
      <div className="grid max-w-[960px] gap-6 min-[1600px]:max-w-none">
        <Section n={1} title="Foto hero" description="Foto besar di belakang judul halaman." where={`Halaman ${categoryLabel[cat]} › paling atas`} href={`${PUBLIC_SITE}/work/${cat}`}>
          <SuggestContext.Provider value={{ group: categoryLabel[cat] }}>
            <ImageSlot value={s.hero} onChange={(hero) => set(cat, { hero })} aspect="aspect-[21/9]" />
          </SuggestContext.Provider>
        </Section>
        <Section
          n={2}
          title="Projek pilihan"
          description={`Maksimal ${CATEGORY_SELECTED_MAX} projek, masing-masing diceritakan dengan dua foto.`}
          where={`Halaman ${categoryLabel[cat]} › Proyek pilihan`}
          href={`${PUBLIC_SITE}/work/${cat}#projects`}
        >
          <ProjectPicker value={s.selected} onChange={(selected) => set(cat, { selected })} options={pickable(cat)} max={CATEGORY_SELECTED_MAX} />
        </Section>
        <Section n={3} title="Arsip proyek" where={`Halaman ${categoryLabel[cat]} › Arsip proyek`}>
          <p className="text-sm text-kumo-subtle">
            Terisi otomatis dengan semua projek {categoryLabel[cat]} yang tayang (sekarang {live(cat).length}). Tidak perlu diatur.
          </p>
        </Section>
      </div>
      {saveBar}
    </Page>
  )
}

const SiteLink = ({ path }: { path: string }) => (
  <a href={`${PUBLIC_SITE}${path}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[13px] font-medium ring-1 ring-kumo-line transition hover:bg-kumo-tint">
    {path} <ArrowSquareOut size={12} />
  </a>
)

/** The right-hand panel: the page as a list of its sections, the numbered ones set here. */
function PageMap({ page }: { page: 'work' | Category }) {
  const items: [string, number | null][] =
    page === 'work'
      ? [['Judul & pengantar', null], ['Lokasi projek', null], ...categories.map((c, i) => [title[c], i + 1] as [string, number]), ['Arsip (15 baris pertama)', null]]
      : [['Foto hero', 1], ['Pernyataan', null], ['Proyek pilihan', 2], ['Yang kami rancang', null], ['Alasan memilih kami', null], ['Arsip proyek', 3], ['Kategori lain', null], ['Formulir kontak', null]]
  return (
    <AsideSection title="Susunan halaman">
      <p className="-mt-2 mb-4 text-xs text-kumo-subtle">Bagian bernomor diatur di sini; sisanya otomatis.</p>
      <ol className="grid gap-1">
        {items.map(([label, n]) => (
          <li key={label} className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm ${n ? 'bg-kumo-brand/10 font-medium text-kumo-strong ring-1 ring-kumo-brand/30' : 'text-kumo-subtle'}`}>
            <span className={`grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${n ? 'bg-kumo-brand text-white' : ''}`}>{n ?? ''}</span>
            {label}
          </li>
        ))}
      </ol>
    </AsideSection>
  )
}
