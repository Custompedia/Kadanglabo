import { useState } from 'react'
import { useParams } from 'react-router'
import { Banner, Button, Empty, LinkButton, Loader, Select } from '@cloudflare/kumo'
import { ArrowLeft, Check } from '@phosphor-icons/react'
import {
  categories,
  categoryLabel,
  emptyDoc,
  projectStatuses,
  projectThemes,
  scopeOptions,
  statusLabel,
  type Lang,
  type ProjectContent,
  type Tx,
} from '../../../shared/content'
import { Page } from '../layout/Page'
import { PUBLIC_SITE } from '../layout/Shell'
import { useRecordEditor } from '../lib/useRecordEditor'
import { slugify } from '../lib/format'
import { EditLangProvider, FieldShell, GroupDivider, LangTabs, RichField, Section, SlugField, TextField, TxField } from '../components/Fields'
import { ImageSlot } from '../components/ImageSlot'
import { GalleryBuilder } from '../components/GalleryBuilder'
import { PublishPanel } from '../components/PublishPanel'
import { StateBadge } from '../components/StateBadge'
import { LeaveDialog } from '../components/LeaveDialog'
import { LocationSelect } from '../components/LocationSelect'
import { SuggestContext } from '../components/MediaPicker'
import { mutate } from '../lib/useFetch'

const tx = (): Tx => ({ en: '', id: '' })
const rich = () => ({ en: emptyDoc(), id: emptyDoc() })

function blank(): ProjectContent {
  return {
    slug: '',
    title: '',
    category: 'residential',
    archiveOnly: false,
    typology: tx(),
    location: null,
    region: null,
    year: null,
    status: null,
    scope: [scopeOptions[0]],
    color: projectThemes[0].color,
    accent: projectThemes[0].accent,
    tagline: tx(),
    summary: rich(),
    story: [],
    hero: '',
    cover: '',
    gallery: [],
  }
}


/*
 * One project, laid out in the order of its page on the site: the basics (also all an archive-only entry needs),
 * the facts band, tagline and summary, the cover and hero, the five-part story and the photo gallery.
 */
export default function ProjectEditor() {
  const { id } = useParams()
  const e = useRecordEditor<ProjectContent>('project', id, blank)
  const [lang, setLang] = useState<Lang>('id')
  const [slugTouched, setSlugTouched] = useState(!e.isNew)
  const d = e.draft

  if (e.error)
    return (
      <Page title="Projek" aside={false}>
        <Empty title="Projek tidak bisa dibuka" description={e.error.message} contents={<LinkButton href="/projects" icon={ArrowLeft}>Kembali ke daftar</LinkButton>} />
      </Page>
    )
  if (!d)
    return (
      <div className="grid place-items-center py-32">
        <Loader size="lg" />
      </div>
    )

  const set = <K extends keyof ProjectContent>(k: K, v: ProjectContent[K]) => e.update((x) => ({ ...x, [k]: v }))

  return (
    <EditLangProvider value={{ lang, setLang }}>
      <SuggestContext.Provider value={{ owner: d.title, group: categoryLabel[d.category] }}>
      <Page
        wide
        title={d.title || 'Projek baru'}
        pill={e.meta && <StateBadge state={e.meta.state} dirty={!!e.meta.dirty} />}
        back={{ label: 'Projek', href: '/projects' }}
        sticky
        tabs={<LangTabs lang={lang} setLang={setLang} issues={e.issues} />}
        aside={
          <PublishPanel
            kind="project"
            id={e.meta?.id ?? null}
            title={d.title || 'Tanpa judul'}
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
            onStateChange={(s, at) => (e.setState(s, at ? { published_at: at, dirty: 0 } : {}), mutate('/projects'))}
            liveLink={!d.archiveOnly}
          />
        }
      >
        <div className="grid max-w-[960px] gap-6 pb-24">
          {e.meta?.state === 'trashed' && <Banner variant="alert" title="Projek ini ada di Trash" description="Pulihkan dulu agar bisa diedit dan ditayangkan lagi." />}

          <GroupDivider>Data projek</GroupDivider>
          <Section n={1} title="Informasi dasar" where="Halaman projek, Our Work, halaman kategori, dan arsip">
            <TextField
              label="Judul projek"
              required
              value={d.title}
              placeholder="mis. La Barka Resort"
              onChange={(title) => e.update((x) => ({ ...x, title, slug: slugTouched ? x.slug : slugify(title) }))}
            />
            <SlugField label="Alamat halaman" prefix="/work/" value={d.slug} live={e.meta?.state === 'published'} hint="Terisi otomatis dari judul." onChange={(v) => (setSlugTouched(true), set('slug', v))} />
            <div className="grid items-start gap-5 sm:grid-cols-2">
              <FieldShell label="Kategori" required>
                <Select aria-label="Kategori" className="w-full" value={d.category} onValueChange={(v) => set('category', v as ProjectContent['category'])} items={Object.fromEntries(categories.map((c) => [c, categoryLabel[c]]))} />
              </FieldShell>
              <FieldShell label="Status projek">
                <Select
                  aria-label="Status projek"
                  className="w-full"
                  value={d.status ?? 'none'}
                  onValueChange={(v) => set('status', v === 'none' ? null : (v as ProjectContent['status']))}
                  items={{ none: 'Belum diisi', ...Object.fromEntries(projectStatuses.map((s) => [s, statusLabel[s].id])) }}
                />
              </FieldShell>
              <LocationSelect value={d.region} onChange={(v) => set('region', v)} />
              <TextField label="Tahun" type="number" value={d.year ? String(d.year) : ''} placeholder="mis. 2024" onChange={(v) => set('year', v ? Number(v) : null)} />
            </div>
            <ImageSlot label="Foto cover" hint="foto di kartu, daftar, dan arsip" value={d.cover} onChange={(v) => e.update((x) => ({ ...x, cover: v, hero: x.hero || v }))} className="max-w-md" />
            {d.archiveOnly && <p className="rounded-lg bg-kumo-recessed px-3.5 py-2.5 text-sm text-kumo-subtle">Entri ini hanya tampil di tabel arsip (tanpa halaman projek), jadi cukup bagian ini yang diisi.</p>}
          </Section>

          {!d.archiveOnly && (
            <>
              <GroupDivider hint="Urutannya sama seperti halaman projek dari atas ke bawah.">Halaman projek</GroupDivider>
              <Section n={2} title="Bagian atas" where="Halaman projek › judul dan foto besar" href={e.meta?.state === 'published' && d.slug ? `${PUBLIC_SITE}/work/${d.slug}` : undefined}>
                <TxField label="Tagline" required value={d.tagline} onChange={(v) => set('tagline', v)} placeholder={{ en: 'One line about the project', id: 'Satu kalimat tentang projek' }} hint="Tampil di bawah judul." />
                <FieldShell label="Warna latar">
                  <div className="flex flex-wrap gap-2">
                    {projectThemes.map((t) => {
                      const on = d.color.toLowerCase() === t.color.toLowerCase()
                      return (
                        <button
                          key={t.key}
                          type="button"
                          aria-pressed={on}
                          onClick={() => e.update((x) => ({ ...x, color: t.color, accent: t.accent }))}
                          className={`flex items-center gap-2.5 rounded-lg py-1.5 pl-1.5 pr-3 text-sm ring-1 transition ${on ? 'ring-2 ring-kumo-brand' : 'ring-kumo-line hover:ring-kumo-fill'}`}
                        >
                          <span className="grid h-7 w-10 place-items-center rounded-md text-[10px] font-bold" style={{ background: t.color, color: t.accent }}>
                            Aa
                          </span>
                          {t.label}
                        </button>
                      )
                    })}
                  </div>
                </FieldShell>
                <ImageSlot label="Foto besar" hint="lebar penuh di bawah judul" value={d.hero} onChange={(v) => set('hero', v)} aspect="aspect-[21/9]" />
              </Section>

              <Section n={3} title="Info projek dan paragraf pembuka" where="Halaman projek › Project info" href={e.meta?.state === 'published' && d.slug ? `${PUBLIC_SITE}/work/${d.slug}` : undefined}>
                <TxField label="Tipologi" required value={d.typology} onChange={(v) => set('typology', v)} placeholder={{ en: 'e.g. Resort', id: 'mis. Resort' }} />
                <FieldShell label="Lingkup pekerjaan">
                  <div className="flex flex-wrap gap-2">
                    {scopeOptions.map((sc) => {
                      const on = d.scope.some((x) => x.en === sc.en)
                      return (
                        <button
                          key={sc.en}
                          type="button"
                          aria-pressed={on}
                          onClick={() => set('scope', on ? d.scope.filter((x) => x.en !== sc.en) : [...d.scope, sc])}
                          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ring-1 transition ${on ? 'bg-kumo-contrast text-kumo-inverse ring-transparent' : 'bg-kumo-base text-kumo-default ring-kumo-line hover:ring-kumo-fill'}`}
                        >
                          {on && <Check size={14} weight="bold" />}
                          {sc[lang]}
                        </button>
                      )
                    })}
                  </div>
                </FieldShell>
                <TextField label="Lokasi lengkap" value={d.location ?? ''} placeholder="mis. Nanggulan, Kulon Progo, D.I. Yogyakarta" onChange={(v) => set('location', v || null)} />
                <div className="grid items-start gap-5 sm:grid-cols-2">
                  <TextField label="Luas lahan" value={d.landArea ?? ''} placeholder="mis. 2.344 m²" onChange={(v) => set('landArea', v || undefined)} />
                  <TextField label="Luas bangunan" value={d.buildingArea ?? ''} placeholder="mis. 718 m²" onChange={(v) => set('buildingArea', v || undefined)} />
                  <TxField label="Skema pengerjaan" value={d.delivery ?? tx()} onChange={(v) => set('delivery', v.en || v.id ? v : undefined)} placeholder={{ en: 'e.g. Design & Build', id: 'mis. Design & Build' }} />
                  <TextField label="Klien" value={d.client ?? ''} onChange={(v) => set('client', v || undefined)} />
                </div>
                <RichField label="Paragraf pembuka" required value={d.summary} onChange={(v) => set('summary', v)} hint="Teks besar di samping Project info." />
              </Section>

              <Section n={4} title="Galeri" description="Foto dan teks dari atas ke bawah, sesuai urutan di halaman." where="Halaman projek › bawah" href={e.meta?.state === 'published' && d.slug ? `${PUBLIC_SITE}/work/${d.slug}` : undefined}>
                <GalleryBuilder value={d.gallery} onChange={(g) => set('gallery', g)} />
              </Section>
            </>
          )}

          {e.isNew && (
            <div className="flex justify-end">
              <Button variant="primary" loading={e.saving} disabled={!d.title.trim() || !d.slug} onClick={() => void e.save()}>
                Simpan draft
              </Button>
            </div>
          )}
        </div>
      </Page>
      <LeaveDialog editor={e} />
      </SuggestContext.Provider>
    </EditLangProvider>
  )
}
