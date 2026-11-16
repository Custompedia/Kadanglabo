import { Button, Banner } from '@cloudflare/kumo'
import { ArrowCounterClockwise, ArrowSquareOut, CaretRight, CheckCircle, Circle, CircleNotch, Eye, EyeSlash, FloppyDisk, RocketLaunch, Trash, WarningCircle } from '@phosphor-icons/react'
import type { RecordState } from '../../../shared/content'
import { AsideSection } from '../layout/Page'
import { PUBLIC_SITE } from '../layout/Shell'
import { ago, dateTime } from '../lib/format'
import { useContentActions } from '../lib/actions'
import type { Kind } from '../lib/types'
import { StateBadge } from './StateBadge'
import { useConfirm } from './Confirm'
import { useFieldLang } from './Fields'
import { issueText, reveal } from '../lib/reveal'
import { useToasts } from './Toaster'

/*
 * The editor's right-hand panel: where the item stands, Save / Publish / Take down / Preview, and what is still
 * missing (live, from shared/publish.ts like the Worker's own check): each row goes to its empty field. Publish with
 * something missing opens a short popup instead, and "Tunjukkan" goes to the first one.
 */
export function PublishPanel({
  kind,
  id,
  title,
  slug,
  liveSlug,
  state,
  dirty,
  isNew,
  unsaved,
  saving,
  savedAt,
  saveError,
  issues,
  draft,
  publishedAt,
  onSave,
  onStateChange,
  extra,
  liveLink = true,
}: {
  kind: Kind
  id: number | null
  title: string
  slug: string
  liveSlug?: string
  state: RecordState
  dirty: boolean
  isNew: boolean
  unsaved: boolean
  saving: boolean
  savedAt: string | null
  saveError: string | null
  issues: string[]
  /** what is on screen, to tell which language of a missing text is empty */
  draft?: unknown
  publishedAt: string | null
  onSave: () => Promise<boolean>
  onStateChange: (s: RecordState, publishedAt?: string) => void
  extra?: React.ReactNode
  liveLink?: boolean
}) {
  const actions = useContentActions(kind)
  const { confirm, dialog: missingDialog } = useConfirm()
  const [lang, setLang] = useFieldLang()
  const toasts = useToasts()
  const goTo = (issue: string) => {
    const to = reveal(issue, draft, lang, setLang)
    if (to) toasts.add({ title: `Beralih ke ${to === 'en' ? 'English' : 'Bahasa Indonesia'}`, description: `Isian ${lang === 'en' ? 'English' : 'Bahasa Indonesia'} tetap ada; bagian ini yang masih kosong.` })
  }
  const rows = issueRows(issues, draft)
  const live = state === 'published'
  const shownSlug = live && liveSlug ? liveSlug : slug
  const url = `${PUBLIC_SITE}/${kind === 'project' ? 'work' : 'articles'}/${shownSlug}`

  async function publish() {
    if (!id) return
    if (issues.length) {
      const lines = rows.map((r) => r.text)
      const go = await confirm({
        title: 'Belum bisa ditayangkan',
        body: (
          <span className="grid gap-1">
            <span>Masih ada yang perlu diisi:</span>
            {lines.map((l) => (
              <span key={l} className="text-kumo-default">• {l}</span>
            ))}
          </span>
        ),
        action: 'Tunjukkan',
      })
      if (go) goTo(rows[0].issue)
      return
    }
    if (unsaved && !(await onSave())) return
    const r = await actions.publish(id, title)
    if (r) onStateChange('published', String(r.published_at ?? new Date().toISOString()))
  }

  return (
    <>
      {missingDialog}
      <AsideSection title="Publikasi" extra={!isNew && <StateBadge state={state} dirty={dirty} />}>
        <p className="mb-4 flex items-center gap-1.5 text-sm text-kumo-subtle" aria-live="polite">
          {saving ? (
            <>
              <CircleNotch size={15} className="animate-spin" /> Menyimpan…
            </>
          ) : saveError ? (
            <>
              <WarningCircle size={15} className="text-kumo-danger" /> <span className="text-kumo-danger">Belum tersimpan</span>
            </>
          ) : isNew ? (
            'Belum disimpan. Simpan draft untuk mulai.'
          ) : unsaved ? (
            'Ada perubahan yang belum disimpan'
          ) : (
            <>
              <CheckCircle size={15} className="text-kumo-success" /> Tersimpan {ago(savedAt)}
            </>
          )}
        </p>

        <div className="grid gap-2">
          {state === 'trashed' ? (
            <Button className="w-full justify-center" icon={ArrowCounterClockwise} onClick={async () => {
              if (!id) return
              const result = await actions.restore(id, title)
              if (result) onStateChange(result.state as RecordState)
            }}>
              Pulihkan dari Trash
            </Button>
          ) : (
            <>
              {live && !dirty && !unsaved ? (
                <Button className="w-full justify-center" variant="secondary" icon={CheckCircle} disabled>
                  Tayang · tidak ada perubahan
                </Button>
              ) : (
                <Button className="w-full justify-center" variant="primary" icon={RocketLaunch} disabled={isNew} onClick={() => void publish()}>
                  {live ? 'Tayangkan perubahan' : 'Tayangkan di website'}
                </Button>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Button className="w-full justify-center" icon={FloppyDisk} loading={saving} disabled={!isNew && !unsaved} onClick={() => void onSave()}>
                  Simpan
                </Button>
                <Button className="w-full justify-center" icon={Eye} disabled={isNew} onClick={() => id && void (unsaved ? onSave() : Promise.resolve(true)).then((ok) => { if (ok) void actions.preview(id) })}>
                  Preview
                </Button>
              </div>
            </>
          )}
        </div>

        {saveError && (
          <Banner variant="error" size="sm" className="mt-3" description={saveError} />
        )}


        {!isNew && state !== 'trashed' && (
          <div className="mt-5 border-t border-kumo-hairline pt-4">
            {issues.length ? (
              <>
                <p className="text-sm font-medium text-kumo-strong">{rows.length} hal lagi sebelum tayang</p>
                <ul className="mt-2 -mx-2 grid">
                  {rows.map((r) => (
                    <li key={r.text}>
                      <button
                        type="button"
                        onClick={() => goTo(r.issue)}
                        className="group flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm text-kumo-default transition hover:bg-kumo-tint"
                      >
                        <Circle size={14} className="shrink-0 text-kumo-subtle" />
                        <span className="min-w-0 flex-1">{r.text}</span>
                        <CaretRight size={13} className="shrink-0 text-kumo-subtle opacity-0 transition group-hover:opacity-100" />
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="flex items-center gap-1.5 text-sm text-kumo-default">
                <CheckCircle size={15} weight="fill" className="text-kumo-success" /> Siap tayang, semua isian lengkap
              </p>
            )}
          </div>
        )}

        {!isNew && (
          <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-kumo-subtle">Tayang sejak</dt>
            <dd className="text-right">{live ? dateTime(publishedAt) : '-'}</dd>
            <dt className="text-kumo-subtle">Alamat</dt>
            <dd className="truncate text-right">
              {live && liveLink ? (
                <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-kumo-link hover:underline">
                  /{kind === 'project' ? 'work' : 'articles'}/{shownSlug} <ArrowSquareOut size={12} />
                </a>
              ) : (
                <span className="text-kumo-subtle">
                  /{kind === 'project' ? 'work' : 'articles'}/{slug || '…'}
                </span>
              )}
            </dd>
          </dl>
        )}
      </AsideSection>

      {extra}

      {!isNew && id && state !== 'trashed' && (
        <AsideSection title="Lainnya">
          <div className="grid gap-2">
            {live && (
              <Button className="w-full justify-center" icon={EyeSlash} onClick={async () => (await actions.takedown(id, title)) && onStateChange('taken_down')}>
                Turunkan dari website
              </Button>
            )}
            <Button className="w-full justify-center" variant="secondary-destructive" icon={Trash} onClick={async () => (await actions.trash(id, title, live)) && onStateChange('trashed')}>
              Pindahkan ke Trash
            </Button>
          </div>
        </AsideSection>
      )}
      {actions.dialog}
    </>
  )
}

/**
 * What still stops Publish, one row each and all of them: the gallery's empty photo slots counted in one row, and
 * "(ID & EN)" for the texts that need both languages. Each row keeps the issue it stands for, to go to its field.
 */
function issueRows(issues: string[], draft: unknown): { text: string; issue: string }[] {
  const out: { text: string; issue: string }[] = []
  let slots = 0
  const blocks: number[] = []
  let firstSlot = ''
  for (const i of issues) {
    const g = /^Galeri blok (\d+): (dua foto|foto)$/.exec(i)
    if (g) {
      slots += g[2] === 'dua foto' ? 2 : 1
      blocks.push(Number(g[1]))
      firstSlot ||= i
    } else out.push({ text: issueText(i, draft), issue: i })
  }
  if (slots) {
    const range = blocks.length > 1 ? `blok ${Math.min(...blocks)}–${Math.max(...blocks)}` : `blok ${blocks[0]}`
    const at = out.findIndex((r) => !r.text.startsWith('Foto'))
    out.splice(at < 0 ? out.length : at, 0, { text: `Foto galeri: ${slots} belum diisi (${range})`, issue: firstSlot })
  }
  return out
}
