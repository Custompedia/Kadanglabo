import { useLayoutEffect, useRef, useState, type TextareaHTMLAttributes } from 'react'
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
 * An article, written like on Medium: one flat page that reads like the published article (title, short
 * intro, banner, then the text with its subheadings, lists, quotes and photos). Everything that
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
  const setTx = (k: 'title' | 'excerpt' | 'coverCaption' | 'tag', v: string) =>
    e.update((x) => {
      const next = { ...(x[k] ?? tx()), [lang]: v }
      return { ...x, [k]: next, ...(k === 'title' && !slugTouched ? { slug: slugify(next.id || next.en) } : {}) }
    })
  const related = relatedSet ?? !!d.project
  const pageProjects = (projects.data?.items ?? []).filter((p) => !p.archive_only && p.state === 'published').map((p) => ({ ...p, slug: p.published_slug || p.slug }))
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
        responsiveAside
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
              liveSlug={e.meta?.published?.slug}
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
              onStateChange={(s, at) => (e.setState(s, at ? { published_at: at, dirty: 0, published: d } : {}), mutate('/articles'))}
              extra={settings}
            />
          }
        >
          {e.meta?.state === 'trashed' && <Banner variant="alert" className="mb-6 max-w-[760px]" title="Artikel ini ada di Trash" description="Pulihkan dulu agar bisa diedit dan ditayangkan lagi." />}

          <div className="article-canvas">
            {/* Title and opening share the borderless reading column. */}
            <div>
              <AutoTextarea
                rows={1}
                value={d.title[lang]}
                onChange={(ev) => setTx('title', ev.target.value)}
                aria-label="Judul artikel"
                placeholder={lang === 'id' ? 'Judul' : 'Title'}
                className="article-canvas-title"
              />
            </div>
            <div className="mt-[18px]">
              <AutoTextarea
                rows={1}
                aria-label="Deskripsi singkat"
                value={d.excerpt[lang]}
                onChange={(ev) => setTx('excerpt', ev.target.value)}
                placeholder={lang === 'id' ? 'Satu atau dua kalimat tentang isi artikel' : 'One or two sentences about the article'}
                className="article-canvas-lead"
              />
            </div>

            <figure className="article-canvas-cover">
              <ImageSlot value={d.cover} onChange={(v) => set('cover', v)} aspect="aspect-video" />
              <input
                aria-label="Keterangan foto banner"
                value={d.coverCaption?.[lang] ?? ''}
                onChange={(ev) => setTx('coverCaption', ev.target.value)}
                placeholder="Keterangan foto banner (opsional)"
                className="mt-2.5 w-full bg-transparent text-center font-sans text-sm text-kumo-subtle outline-none placeholder:text-kumo-placeholder"
              />
            </figure>

            {/* the article */}
            <div className="mt-8">
              {(['id', 'en'] as const).map((bodyLang) => (
                <div key={bodyLang} hidden={lang !== bodyLang}>
                  <RichEditor
                    article
                    lang={bodyLang}
                    value={d.body[bodyLang]}
                    onChange={(doc) => e.update((x) => ({ ...x, body: { ...x.body, [bodyLang]: doc } }))}
                    placeholder={bodyLang === 'id' ? 'Mulai menulis…' : 'Start writing…'}
                  />
                </div>
              ))}
            </div>
          </div>
        </Page>
        <LeaveDialog editor={e} />
      </SuggestContext.Provider>
    </EditLangProvider>
  )
}

/** Resize on language, content, and column changes, including browsers without field-sizing. */
function AutoTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return
    const resize = () => {
      node.style.height = 'auto'
      node.style.height = `${node.scrollHeight}px`
    }
    resize()
    let width = node.getBoundingClientRect().width
    const observer = new ResizeObserver(() => {
      const next = node.getBoundingClientRect().width
      if (next !== width) { width = next; resize() }
    })
    observer.observe(node)
    document.fonts.ready.then(() => { if (node.isConnected) resize() })
    return () => observer.disconnect()
  }, [props.value])
  return <textarea {...props} ref={ref} />
}
