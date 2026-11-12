import { useState, type ReactNode } from 'react'
import { useParams } from 'react-router'
import { Banner, Empty, LinkButton, Loader, Select, Switch } from '@cloudflare/kumo'
import { ArrowLeft } from '@phosphor-icons/react'
import { emptyDoc, type ArticleContent, type Lang, type Tx } from '../../../shared/content'
import { AsideSection, Page } from '../layout/Page'
import { useRecordEditor } from '../lib/useRecordEditor'
import { useFetch, mutate } from '../lib/useFetch'
import { slugify } from '../lib/format'
import type { ListItem } from '../lib/types'
import { EditLangProvider, FieldShell, LangTabs, SlugField } from '../components/Fields'
import { ImageSlot } from '../components/ImageSlot'
import { SuggestContext } from '../components/MediaPicker'
import { RichEditor } from '../components/RichEditor'
import { PublishPanel } from '../components/PublishPanel'
import { StateBadge } from '../components/StateBadge'
import { LeaveDialog } from '../components/LeaveDialog'
import { TopicSelect } from '../components/TopicSelect'

/*
 * An article, written like on Medium: one flat page that reads like the published article (banner, title, short
 * intro, an optional "In short" box, then the text with its subheadings, lists, quotes and photos). Everything that
 * is a setting rather than writing (topic, address, related project; the date is set when it goes live) sits in the right-hand panel.
 */

const tx = (): Tx => ({ en: '', id: '' })

function blank(): ArticleContent {
  return { slug: '', type: 'news', tag: tx(), title: tx(), date: '', excerpt: tx(), cover: '', body: { en: emptyDoc(), id: emptyDoc() } }
}

export default function ArticleEditor() {
  const { id } = useParams()
  const e = useRecordEditor<ArticleContent>('article', id, blank)
  const [lang, setLang] = useState<Lang>('id')
  const [slugTouched, setSlugTouched] = useState(!e.isNew)
  const [relatedSet, setRelated] = useState<boolean | null>(null)
  const projects = useFetch<{ items: ListItem[] }>('/projects')
  const d = e.draft

  if (e.error)
    return (
      <Page title="Artikel" aside={false}>
        <Empty title="Artikel tidak bisa dibuka" description={e.error.message} contents={<LinkButton href="/articles" icon={ArrowLeft}>Kembali ke daftar</LinkButton>} />
      </Page>
    )
  if (!d)
    return (
      <div className="grid place-items-center py-32">
        <Loader size="lg" />
      </div>
    )

  const set = <K extends keyof ArticleContent>(k: K, v: ArticleContent[K]) => e.update((x) => ({ ...x, [k]: v }))
  const setTx = (k: 'title' | 'excerpt' | 'summary' | 'coverCaption' | 'tag', v: string) =>
    e.update((x) => {
      const next = { ...(x[k] ?? tx()), [lang]: v }
      return { ...x, [k]: next, ...(k === 'title' && !slugTouched ? { slug: slugify(next.id || next.en) } : {}) }
    })
  const related = relatedSet ?? !!d.project
  const pageProjects = (projects.data?.items ?? []).filter((p) => !p.archive_only && p.state !== 'trashed')
  const other: Lang = lang === 'id' ? 'en' : 'id'

  const settings = (
    <AsideSection title="Detail artikel">
      <div className="grid gap-4">
        <TopicSelect value={d.tag} onChange={(t) => set('tag', t)} />
        <SlugField label="Alamat halaman" prefix="/articles/" value={d.slug} live={e.meta?.state === 'published'} hint="Terisi otomatis dari judul." onChange={(v) => (setSlugTouched(true), set('slug', v))} />
        <div className="grid gap-2.5">
          <Switch
            label="Tampilkan projek terkait"
            checked={related}
            onCheckedChange={(on) => {
              setRelated(on)
              if (!on) set('project', undefined)
            }}
          />
          {related && (
            <FieldShell label="Projek" hint="Tampil sebagai kartu di samping artikel.">
              <Select
                aria-label="Projek terkait"
                className="w-full"
                value={d.project ?? 'none'}
                onValueChange={(v) => set('project', v === 'none' ? undefined : String(v))}
                items={{ none: 'Pilih projek', ...(d.project ? { [d.project]: d.project } : {}), ...Object.fromEntries(pageProjects.map((p) => [p.slug, p.title])) }}
              />
            </FieldShell>
          )}
        </div>
      </div>
    </AsideSection>
  )

  return (
    <EditLangProvider value={{ lang, setLang }}>
      <SuggestContext.Provider value={{ owner: d.title.en || d.title.id, group: 'Artikel' }}>
        <Page
          wide
          title={d.title[lang] || d.title[other] || 'Artikel baru'}
          pill={e.meta && <StateBadge state={e.meta.state} dirty={!!e.meta.dirty} />}
          back={{ label: 'Artikel', href: '/articles' }}
          sticky
          tabs={<LangTabs lang={lang} setLang={setLang} issues={e.issues} />}
          aside={
            <PublishPanel
              kind="article"
              id={e.meta?.id ?? null}
              title={d.title.en || d.title.id || 'Tanpa judul'}
              slug={d.slug}
              state={e.meta?.state ?? 'draft'}
              dirty={!!e.meta?.dirty}
              isNew={e.isNew}
              unsaved={e.unsaved}
              saving={e.saving}
              savedAt={e.savedAt}
              saveError={e.saveError}
              issues={e.issues}
              publishedAt={e.meta?.published_at ?? null}
              onSave={() => e.save()}
              onStateChange={(s, at) => (e.setState(s, at ? { published_at: at, dirty: 0 } : {}), mutate('/articles'))}
              extra={settings}
            />
          }
        >
          {e.meta?.state === 'trashed' && <Banner variant="alert" className="mb-6 max-w-[760px]" title="Artikel ini ada di Trash" description="Pulihkan dulu agar bisa diedit dan ditayangkan lagi." />}

          <div className="max-w-[760px] pb-24">
            {/* the banner */}
            <ImageSlot value={d.cover} onChange={(v) => set('cover', v)} aspect="aspect-[21/10]" />
            <input
              value={d.coverCaption?.[lang] ?? ''}
              onChange={(ev) => setTx('coverCaption', ev.target.value)}
              placeholder="Keterangan foto banner (opsional)"
              className="mt-2 w-full bg-transparent text-[13px] text-kumo-subtle outline-none placeholder:text-kumo-placeholder"
            />

            {/* title and the short intro, as large as on the site */}
            <Flat label="Judul">
              <textarea
                rows={1}
                value={d.title[lang]}
                onChange={(ev) => setTx('title', ev.target.value)}
                placeholder={lang === 'id' ? 'Judul artikel' : 'Article title'}
                className="w-full resize-none bg-transparent text-[34px] font-semibold leading-[1.15] tracking-tight text-kumo-strong outline-none placeholder:text-kumo-placeholder [field-sizing:content]"
              />
            </Flat>
            <Flat label="Deskripsi singkat" hint="di bawah judul dan di kartu artikel">
              <textarea
                rows={2}
                value={d.excerpt[lang]}
                onChange={(ev) => setTx('excerpt', ev.target.value)}
                placeholder={lang === 'id' ? 'Satu atau dua kalimat tentang isi artikel' : 'One or two sentences about the article'}
                className="w-full resize-none bg-transparent text-lg leading-relaxed text-kumo-default outline-none placeholder:text-kumo-placeholder [field-sizing:content]"
              />
            </Flat>

            {/* the grey "In short" box */}
            <div className="mt-6 rounded-xl bg-kumo-recessed px-5 py-4 ring-1 ring-kumo-hairline">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-kumo-brand">Ringkasnya (opsional)</p>
              <textarea
                rows={2}
                value={d.summary?.[lang] ?? ''}
                onChange={(ev) => setTx('summary', ev.target.value)}
                placeholder={lang === 'id' ? 'Inti artikel singkat' : 'The gist, briefly'}
                className="mt-1.5 w-full resize-none bg-transparent text-[16px] leading-relaxed outline-none placeholder:text-kumo-placeholder [field-sizing:content]"
              />
            </div>

            {/* the article */}
            <div className="mt-8">
              <RichEditor
                key={lang}
                article
                lang={lang}
                value={d.body[lang]}
                onChange={(doc) => set('body', { ...d.body, [lang]: doc })}
                placeholder={lang === 'id' ? 'Mulai menulis…' : 'Start writing…'}
              />
            </div>
          </div>
        </Page>
        <LeaveDialog editor={e} />
      </SuggestContext.Provider>
    </EditLangProvider>
  )
}

/** A borderless field with a small label above it. */
function Flat({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="mt-6 border-b border-kumo-hairline pb-3 focus-within:border-kumo-line">
      <p className="mb-1 text-xs text-kumo-subtle">
        <span className="font-medium">{label}</span>
        {hint && <span className="text-kumo-inactive"> · {hint}</span>}
      </p>
      {children}
    </div>
  )
}
