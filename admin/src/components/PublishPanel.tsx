import { Button, Banner } from '@cloudflare/kumo'
import { ArrowCounterClockwise, ArrowSquareOut, CheckCircle, CircleNotch, Eye, EyeSlash, FloppyDisk, RocketLaunch, Trash, WarningCircle } from '@phosphor-icons/react'
import type { RecordState } from '../../../shared/content'
import { AsideSection } from '../layout/Page'
import { PUBLIC_SITE } from '../layout/Shell'
import { ago, dateTime } from '../lib/format'
import { useContentActions } from '../lib/actions'
import type { Kind } from '../lib/types'
import { StateBadge } from './StateBadge'

/*
 * The editor's right-hand panel: where the item stands, Save / Publish / Take down / Preview, and what is still
 * missing before it can go live.
 */
export function PublishPanel({
  kind,
  id,
  title,
  slug,
  state,
  dirty,
  isNew,
  unsaved,
  saving,
  savedAt,
  saveError,
  issues,
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
  state: RecordState
  dirty: boolean
  isNew: boolean
  unsaved: boolean
  saving: boolean
  savedAt: string | null
  saveError: string | null
  issues: string[]
  publishedAt: string | null
  onSave: () => Promise<boolean>
  onStateChange: (s: RecordState, publishedAt?: string) => void
  extra?: React.ReactNode
  liveLink?: boolean
}) {
  const actions = useContentActions(kind)
  const live = state === 'published'
  const url = `${PUBLIC_SITE}/${kind === 'project' ? 'work' : 'articles'}/${slug}`

  async function publish() {
    if (!id) return
    if (unsaved && !(await onSave())) return
    const r = await actions.publish(id, title)
    if (r) onStateChange('published', String(r.published_at ?? new Date().toISOString()))
  }

  return (
    <>
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
            <Button className="w-full justify-center" icon={ArrowCounterClockwise} onClick={async () => id && (await actions.restore(id, title)) && onStateChange('draft')}>
              Pulihkan dari Trash
            </Button>
          ) : (
            <>
              {live && !dirty && !unsaved ? (
                <Button className="w-full justify-center" variant="secondary" icon={CheckCircle} disabled>
                  Tayang · tidak ada perubahan
                </Button>
              ) : (
                <Button className="w-full justify-center" variant="primary" icon={RocketLaunch} disabled={isNew || (issues.length > 0 && !unsaved)} title={issues.length && !unsaved ? 'Lengkapi isian di bawah dulu' : undefined} onClick={() => void publish()}>
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

        {!isNew && issues.length > 0 && state !== 'trashed' && (
          <div className="mt-4 rounded-lg bg-kumo-warning-tint px-3.5 py-3 text-sm">
            <p className="font-medium text-kumo-strong">Lengkapi sebelum tayang</p>
            <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-kumo-default">
              {issues.slice(0, 8).map((i) => (
                <li key={i}>{i}</li>
              ))}
              {issues.length > 8 && <li>dan {issues.length - 8} lainnya</li>}
            </ul>
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
                  /{kind === 'project' ? 'work' : 'articles'}/{slug} <ArrowSquareOut size={12} />
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
