import { useEffect, type ReactNode } from 'react'
import { Button, LayerCard, Tooltip } from '@cloudflare/kumo'
import { ArrowClockwise, Info } from '@phosphor-icons/react'
import { Page } from '../layout/Page'
import { useFetch } from '../lib/useFetch'
import { ago, bytes, dateTime } from '../lib/format'
import type { BuildInfo, Monitor, Probe, Storage } from '../lib/types'

/*
 * Monitoring: everything about the running site that can be checked from the CMS, in one place.
 * 1. the website, its content API and the CMS (up, how fast, when last deployed, in sync with what is published),
 * 2. storage in every place the site is deployed to (D1 databases, R2 buckets, Workers static files),
 * 3. content, accounts and the scheduled jobs.
 * Checked again every minute while the page is open, or with "Periksa ulang".
 */

const GB10 = 10 * 1024 ** 3 // D1: 10 GB per database (Workers Paid); R2: the free 10 GB
const ASSET_MAX = 25 * 1024 ** 2 // Workers static assets: 25 MiB per file at most
const REFRESH = 60_000

export default function Monitoring() {
  const monitor = useFetch<Monitor>('/monitor')
  const storage = useFetch<Storage>('/storage')
  const m = monitor.data
  const s = storage.data

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void Promise.all([monitor.reload(), storage.reload()])
    }, REFRESH)
    return () => window.clearInterval(id)
  }, [monitor.reload, storage.reload])

  const busy = monitor.loading || storage.loading
  const site = m?.website
  const served = site?.api.served
  // what the website serves should be exactly what the CMS has published
  const inSync = served && s ? served.projects === s.projects.published && served.articles === s.articles.published : null
  const unknown = m ? 'Tidak terbaca' : '-' // a part the server could not work out
  const content = m?.content
  const acc = m?.accounts

  return (
    <Page
      title="Monitoring"
      description="Kondisi website, storage di semua tempat deploy, konten, dan akun. Diperiksa ulang otomatis setiap menit."
      wide
      actions={
        <div className="flex items-center gap-3">
          {m && <span className="text-xs text-kumo-subtle">Diperiksa {ago(m.checkedAt)}</span>}
          <Button icon={<ArrowClockwise size={16} className={busy ? 'animate-spin' : ''} />} disabled={busy} onClick={() => void Promise.all([monitor.reload(), storage.reload()])}>
            Periksa ulang
          </Button>
        </div>
      }
    >
      {(monitor.error || storage.error) && (
        <p className="mb-5 rounded-lg bg-kumo-danger-tint px-4 py-3 text-sm text-kumo-danger">
          Sebagian data tidak bisa dimuat: {(monitor.error ?? storage.error)?.message}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {/* services */}
        <Card title="Website" right={<Status probe={site?.home} pending={!m} />}>
          <Facts
            items={[
              ['Alamat', site ? host(site.url) : unknown],
              ['Respons', response(site?.home, m)],
              ['Deploy terakhir', site ? deployed(site.build) : unknown],
              ['File statis', site?.build ? `${site.build.files.toLocaleString('id-ID')} file · ${bytes(site.build.bytes)}` : '-'],
            ]}
          />
        </Card>
        <Card title="API konten" right={<Status probe={site?.api} pending={!m} />}>
          <Facts
            items={[
              ['Fungsi', 'Sumber data website dari CMS'],
              ['Respons', response(site?.api, m)],
              ['Menayangkan', served ? `${served.projects} projek · ${served.articles} artikel` : '-'],
              ['Sinkron dengan CMS', inSync === null ? '-' : inSync ? <Good>Ya</Good> : <Warn>Tidak sama</Warn>],
            ]}
          />
        </Card>
        <Card title="CMS" right={<Status probe={m ? { ok: true, status: 200, ms: null } : undefined} pending={!m} />}>
          <Facts
            items={[
              ['Alamat', host(location.origin)],
              ['Deploy terakhir', m?.cms ? deployed(m.cms.build) : unknown],
              ['File statis', m?.cms?.build ? `${m.cms.build.files.toLocaleString('id-ID')} file · ${bytes(m.cms.build.bytes)}` : '-'],
              ['Peran akses', 'Khusus admin'],
            ]}
          />
        </Card>

        {/* storage */}
        <StoreCard
          title="Database · D1"
          info={storeInfo.d1}
          limit={GB10}
          loading={!s}
          items={(s?.databases ?? placeholderDbs).map((d) => ({ key: d.name, label: dbLabel[d.name] ?? d.name, hint: dbHint[d.name] ?? d.name, bytes: d.bytes }))}
        />
        <StoreCard
          title="Foto · R2"
          info={storeInfo.r2}
          limit={s?.quota ?? GB10}
          loading={!s}
          items={(s?.buckets ?? placeholderBuckets).map((b) => {
            const originals = b.name.endsWith('originals')
            return {
              key: b.name,
              label: originals ? 'File foto asli' : 'Foto website',
              hint: originals ? r2Hint.originals : r2Hint.media,
              bytes: b.bytes,
              detail: s ? `${b.objects.toLocaleString('id-ID')} file` : undefined,
            }
          })}
        />
        <Card title="File statis · Workers" right={<Note>maks. 25 MB per file</Note>}>
          <ul className="grid gap-4">
            {(
              [
                ['Website', 'HTML, JS, CSS, dan foto bawaan website (kadanglabo-website)', site?.build],
                ['CMS', 'Dashboard ini (kadanglabo-admin)', m?.cms?.build],
              ] as const
            ).map(([label, hint, b]) => (
              <GaugeRow
                key={label}
                label={label}
                hint={b ? `${hint}. File terbesar: ${b.largest.path}` : hint}
                used={b?.largest.bytes ?? 0}
                limit={ASSET_MAX}
                usedLabel={b ? `terbesar ${bytes(b.largest.bytes)}` : undefined}
                detail={b ? `${b.files.toLocaleString('id-ID')} file · ${bytes(b.bytes)}` : undefined}
                empty={m && !b ? 'Info build muncul setelah deploy' : undefined}
                loading={!m}
              />
            ))}
          </ul>
        </Card>

        {/* content, accounts, schedule */}
        <Card title="Konten" right={s ? <Note>{s.projects.published + s.articles.published} tayang</Note> : undefined}>
          <dl className="grid grid-cols-[1fr_auto_auto] gap-x-6 gap-y-2 text-sm">
            <span />
            <dt className="text-right text-xs text-kumo-subtle">Projek</dt>
            <dt className="text-right text-xs text-kumo-subtle">Artikel</dt>
            {(
              [
                ['published', 'Tayang'],
                ['draft', 'Draft'],
                ['taken_down', 'Diturunkan'],
                ['trashed', 'Trash'],
              ] as const
            ).map(([k, label]) => (
              <CountLine key={k} label={label} a={s?.projects[k]} b={s?.articles[k]} />
            ))}
          </dl>
          <Facts
            divided
            items={[
              ['Terakhir ditayangkan', content?.lastPublish ? dateTime(content.lastPublish) : content ? '-' : unknown],
              [
                'Belum ditayangkan',
                !content ? unknown : content.pending.projects + content.pending.articles === 0 ? <Good>Tidak ada</Good> : <Warn>{[content.pending.projects && `${content.pending.projects} projek`, content.pending.articles && `${content.pending.articles} artikel`].filter(Boolean).join(' · ')}</Warn>,
              ],
            ]}
          />
        </Card>
        <Card title="Akun & keamanan" right={acc ? <Note>{acc.users} pengguna</Note> : undefined}>
          <Facts
            items={[
              ['Admin', acc ? acc.admins : unknown],
              ['Sesi login aktif', acc ? acc.activeSessions : unknown],
              ['Login gagal 24 jam', !acc ? unknown : acc.failedLogins24h === 0 ? <Good>0</Good> : <Warn>{acc.failedLogins24h}</Warn>],
              ['Akun terkunci / nonaktif', !acc ? unknown : acc.locked + acc.disabled === 0 ? <Good>Tidak ada</Good> : <Warn>{acc.locked} terkunci · {acc.disabled} nonaktif</Warn>],
              ['Login terakhir', acc?.lastLogin ? dateTime(acc.lastLogin) : acc ? '-' : unknown],
            ]}
          />
        </Card>
        <Card title="Jadwal otomatis" right={<Note>Senin 10.00 WIB</Note>}>
          <p className="mb-4 text-sm text-kumo-subtle">Pembersihan foto: foto yang seminggu tidak dipakai di projek atau artikel dihapus dari R2.</p>
          <Facts
            items={[
              ['Terakhir jalan', !content ? unknown : content.cleanup ? `${dateTime(content.cleanup.at)} · ${content.cleanup.removed} foto` : 'Belum tercatat'],
              ['Berikutnya', m ? dateTime(m.nextCleanup) : '-'],
            ]}
          />
        </Card>
      </div>
    </Page>
  )
}

/* ------------------------------------------------------------------------------------------------ pieces */

const host = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/$/, '')

const deployed = (b: BuildInfo | null) => (b ? `${dateTime(b.builtAt)} (${ago(b.builtAt)})` : 'Muncul setelah deploy')

const response = (p: Probe | undefined, m: Monitor | undefined) =>
  !p ? (m ? 'Tidak terbaca' : '-') : p.error ? <Warn>{p.error}</Warn> : [p.status && `HTTP ${p.status}`, p.ms !== null && `${p.ms} ms`].filter(Boolean).join(' · ') || 'OK'

/** Every card the same: a title bar (with a status or a short note on the right) over its content, full height. */
function Card({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <LayerCard className="flex h-full flex-col p-0">
      <LayerCard.Secondary className="flex min-h-12 items-center justify-between gap-3">
        <span className="font-medium text-kumo-strong">{title}</span>
        {right}
      </LayerCard.Secondary>
      <LayerCard.Primary className="flex-1 p-5">{children}</LayerCard.Primary>
    </LayerCard>
  )
}

const Note = ({ children }: { children: ReactNode }) => <span className="truncate text-xs text-kumo-subtle">{children}</span>

const Good = ({ children }: { children: ReactNode }) => <span className="font-medium text-kumo-success">{children}</span>
const Warn = ({ children }: { children: ReactNode }) => <span className="font-medium text-kumo-warning">{children}</span>

/** Online / Bermasalah / Memeriksa pill. */
function Status({ probe, pending }: { probe?: Probe; pending: boolean }) {
  const state = pending ? 'wait' : !probe ? 'unknown' : probe.ok ? 'up' : 'down'
  const look = {
    up: ['bg-kumo-success-tint text-kumo-success', 'bg-kumo-success', 'Online'],
    down: ['bg-kumo-danger-tint text-kumo-danger', 'bg-kumo-danger', 'Bermasalah'],
    wait: ['bg-kumo-tint text-kumo-subtle', 'bg-kumo-line', 'Memeriksa…'],
    unknown: ['bg-kumo-tint text-kumo-subtle', 'bg-kumo-line', 'Tidak terbaca'],
  }[state]
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${look[0]}`}>
      <span className={`size-1.5 rounded-full ${look[1]}`} />
      {look[2]}
    </span>
  )
}

function Facts({ items, divided }: { items: [string, ReactNode][]; divided?: boolean }) {
  return (
    <dl className={`grid gap-2.5 text-sm ${divided ? 'mt-4 border-t border-kumo-hairline pt-4' : ''}`}>
      {items.map(([k, v]) => (
        <div key={k} className="flex items-baseline justify-between gap-4">
          <dt className="shrink-0 text-kumo-subtle">{k}</dt>
          <dd className="min-w-0 text-right tabular-nums text-kumo-default">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

function CountLine({ label, a, b }: { label: string; a?: number; b?: number }) {
  return (
    <>
      <span className="text-kumo-subtle">{label}</span>
      <dd className="text-right tabular-nums">{a ?? '-'}</dd>
      <dd className="text-right tabular-nums">{b ?? '-'}</dd>
    </>
  )
}

/** "0,2%" (Indonesian decimals); below 0.1% it still says so instead of a bare 0 */
function percent(f: number) {
  const p = f * 100
  if (p > 0 && p < 0.1) return '<0,1%'
  return `${p.toLocaleString('id-ID', { maximumFractionDigits: p < 10 ? 1 : 0 })}%`
}

/** One store: its ring, name and "used / limit", and the share. */
function GaugeRow({ label, hint, used, limit, detail, usedLabel, empty, loading }: { label: string; hint: string; used: number; limit: number; detail?: string; usedLabel?: string; empty?: string; loading: boolean }) {
  return (
    <li className="flex items-center gap-3">
      <Ring share={loading ? 0 : used / limit} used={!loading && used > 0} />
      <div className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-sm text-kumo-default">
          <span className="truncate">{label}</span>
          <Tooltip content={hint}>
            <Info size={13} className="shrink-0 text-kumo-inactive" />
          </Tooltip>
        </span>
        <span className="block text-xs tabular-nums text-kumo-subtle">
          {loading ? '…' : empty ?? `${usedLabel ?? bytes(used)} / ${bytes(limit)}`}
          {detail && !loading && !empty ? ` · ${detail}` : ''}
        </span>
      </div>
      <span className="text-sm tabular-nums text-kumo-strong">{loading || empty ? '' : percent(used / limit)}</span>
    </li>
  )
}

/**
 * A small ring: pale orange track for the limit, orange arc for what is used, from the top, clockwise. Real
 * proportion, except that a store in use always shows a sliver (a few MB of 10 GB would otherwise draw nothing).
 */
function Ring({ share, used }: { share: number; used: boolean }) {
  const R = 15
  const C = 2 * Math.PI * R
  const len = used ? Math.max(Math.min(share, 1), 0.03) * C : 0
  return (
    <svg viewBox="0 0 40 40" className="size-10 shrink-0 -rotate-90" aria-hidden="true">
      <circle cx="20" cy="20" r={R} fill="none" stroke="#fbe3d6" strokeWidth="5" />
      {len > 0 && (
        <circle
          cx="20"
          cy="20"
          r={R}
          fill="none"
          stroke={share >= 0.9 ? '#b8360b' : '#ec6434'}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${len} ${C}`}
          className="transition-[stroke-dasharray] duration-700 ease-out"
        />
      )}
    </svg>
  )
}

/* ------------------------------------------------------------------------------------------------ storage cards */

// one orange per part, strongest first (the parts are drawn largest first)
const SHADES = ['#d34614', '#ec6434', '#f4a27a']

const CONTACT = 'Jika pemakaian mendekati atau melewati batas, hubungi tim Custompedia agar kapasitasnya ditambah tanpa mengganggu website.'

const storeInfo = {
  d1: {
    title: 'Database (Cloudflare D1)',
    body: 'Menyimpan semua teks di CMS: isi projek dan artikel, pengaturan halaman, data foto, dan akun pengguna. Ketiga database dihitung bersama dengan batas 10 GB, ruang yang sangat lega untuk teks.',
  },
  r2: {
    title: 'Penyimpanan foto (Cloudflare R2)',
    body: 'Menyimpan file foto: yang tampil di website dan file asli setiap upload. Keduanya berbagi kuota 10 GB. Foto tak terpakai dibersihkan otomatis setiap Senin, jadi ruangnya tidak terbuang.',
  },
}

const r2Hint = {
  media: 'Foto yang tampil di website, disimpan dalam beberapa ukuran agar cepat dimuat di HP maupun layar besar.',
  originals: 'File asli dari setiap upload, disimpan privat sebagai cadangan. Tidak pernah tampil di website.',
}

type StorePart = { key: string; label: string; hint: string; bytes: number; detail?: string }

/** The (i): a short, friendly explanation; the card-level one also says who to call when space runs out. */
function InfoTip({ title, body, contact }: { title?: string; body: string; contact?: boolean }) {
  return (
    <Tooltip
      delay={150}
      content={
        <span className="block w-max max-w-[280px] space-y-1.5 py-0.5 text-left text-[13px] leading-snug">
          {title && <span className="block font-semibold">{title}</span>}
          <span className="block">{body}</span>
          {contact && <span className="block border-t border-current/20 pt-1.5 opacity-90">{CONTACT}</span>}
        </span>
      }
      render={<button type="button" aria-label={title ? `Tentang ${title}` : 'Keterangan'} className="inline-grid shrink-0 cursor-help place-items-center rounded-full text-kumo-inactive transition hover:text-kumo-default" />}
    >
      <Info size={14} />
    </Tooltip>
  )
}

/**
 * A storage service: one large ring for all its parts together against the shared limit (each part its own orange),
 * the total and the parts beside it. Near the limit it says so, with whom to contact.
 */
function StoreCard({ title, info, limit, items, loading }: { title: string; info: { title: string; body: string }; limit: number; items: StorePart[]; loading: boolean }) {
  const parts = [...items].sort((a, b) => b.bytes - a.bytes).map((p, i) => ({ ...p, color: SHADES[i % SHADES.length] }))
  const used = parts.reduce((n, p) => n + p.bytes, 0)
  const share = used / limit
  const level = loading ? 'ok' : share >= 1 ? 'over' : share >= 0.8 ? 'near' : 'ok'
  return (
    <Card
      title={title}
      right={
        <span className="flex items-center gap-2">
          <Note>batas {bytes(limit)}</Note>
          <InfoTip title={info.title} body={info.body} contact />
        </span>
      }
    >
      <div className="flex items-center gap-5">
        <BigRing parts={loading ? [] : parts} limit={limit} share={loading ? 0 : share} level={level} />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold tabular-nums text-kumo-strong">{loading ? '…' : bytes(used)}</p>
          <p className="mb-3 text-xs tabular-nums text-kumo-subtle">dari {bytes(limit)} terpakai</p>
          <ul className="grid gap-2">
            {parts.map((p) => (
              <li key={p.key} className="flex items-center gap-2 text-sm">
                <span className="size-2 shrink-0 rounded-full" style={{ background: p.color }} aria-hidden="true" />
                <span className="truncate text-kumo-default">{p.label}</span>
                <InfoTip body={p.hint} />
                <span className="ml-auto pl-2 text-right tabular-nums text-kumo-strong">
                  {loading ? '…' : bytes(p.bytes)}
                  {p.detail && !loading && <span className="block text-[11px] font-normal text-kumo-subtle">{p.detail}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {level !== 'ok' && (
        <p className={`mt-4 rounded-lg px-3 py-2 text-xs leading-snug ${level === 'over' ? 'bg-kumo-danger-tint text-kumo-danger' : 'bg-kumo-warning-tint text-kumo-warning'}`}>
          {level === 'over' ? 'Batas penyimpanan sudah terlampaui.' : 'Penyimpanan hampir penuh.'} Hubungi tim Custompedia untuk menambah kapasitas.
        </p>
      )}
    </Card>
  )
}

/**
 * The large ring: pale track for the limit, one orange arc per part laid end to end from the top, the share used in
 * the middle. Real proportions, except that anything in use always shows a sliver (a few MB of 10 GB draws nothing).
 */
function BigRing({ parts, limit, share, level }: { parts: { key: string; bytes: number; color: string }[]; limit: number; share: number; level: 'ok' | 'near' | 'over' }) {
  const R = 40
  const C = 2 * Math.PI * R
  const used = parts.reduce((n, p) => n + p.bytes, 0)
  const scale = used > 0 ? Math.max(Math.min(used / limit, 1), 0.025) / used : 0 // ring length per byte (as a share of C)
  let at = 0
  const arcs = parts
    .filter((p) => p.bytes > 0)
    .map((p) => {
      const len = Math.min(C - at, p.bytes * scale * C)
      const arc = { ...p, len, at }
      at += len
      return arc
    })
  return (
    <div className="relative size-[112px] shrink-0">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={R} fill="none" stroke="#fbe3d6" strokeWidth="11" />
        {arcs.map((a) => (
          <circle
            key={a.key}
            cx="50"
            cy="50"
            r={R}
            fill="none"
            stroke={level === 'over' ? '#b8360b' : a.color}
            strokeWidth="11"
            strokeDasharray={`${a.len} ${C - a.len}`}
            strokeDashoffset={-a.at}
            className="transition-[stroke-dasharray,stroke-dashoffset] duration-700 ease-out"
          />
        ))}
      </svg>
      <span className="absolute inset-0 grid place-content-center text-center">
        <span className="text-base font-semibold tabular-nums text-kumo-strong">{percent(share)}</span>
        <span className="text-[10px] uppercase tracking-wider text-kumo-subtle">terpakai</span>
      </span>
    </div>
  )
}

const dbLabel: Record<string, string> = {
  'kadanglabo-content': 'Data konten',
  'kadanglabo-media': 'Data foto',
  'kadanglabo-auth': 'Data akun',
}

const dbHint: Record<string, string> = {
  'kadanglabo-content': 'Isi projek dan artikel, lokasi, serta pengaturan halaman website.',
  'kadanglabo-media': 'Catatan setiap foto: ukuran, warna dasar, dan di mana foto itu dipakai. Bukan file fotonya.',
  'kadanglabo-auth': 'Akun pengguna CMS dan sesi login yang sedang aktif.',
}

const placeholderDbs = ['kadanglabo-content', 'kadanglabo-media', 'kadanglabo-auth'].map((name) => ({ name, bytes: 0, limit: GB10 }))
const placeholderBuckets = ['kadanglabo-media', 'kadanglabo-originals'].map((name) => ({ name, bytes: 0, objects: 0 }))
