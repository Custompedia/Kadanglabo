import { Tooltip } from '@cloudflare/kumo'
import { Info } from '@phosphor-icons/react'
import { useFetch } from '../lib/useFetch'
import { bytes } from '../lib/format'
import type { Storage } from '../lib/types'
import { AsideSection } from './Page'

/* The right-hand panel: how much storage each database and bucket uses (to keep an eye on, not a limit), and what is in them. */

export function StoragePanel() {
  const { data } = useFetch<Storage>('/storage')
  const dbs = data?.databases ?? placeholder.databases
  const buckets = data?.buckets ?? placeholder.buckets
  const total = data ? [...dbs, ...buckets].reduce((n, x) => n + x.bytes, 0) : null
  return (
    <>
      <AsideSection title="Storage terpakai" extra={total !== null ? bytes(total) : '…'}>
        <ul className="grid gap-2.5">
          {dbs.map((d) => (
            <Row key={`db-${d.name}`} label={dbLabel[d.name] ?? d.name} hint={`${dbHint[d.name] ?? ''} (D1 ${d.name})`} value={data ? bytes(d.bytes) : '…'} />
          ))}
          {buckets.map((b) => (
            <Row
              key={`r2-${b.name}`}
              label={b.name.endsWith('originals') ? 'File foto asli' : 'Foto website'}
              hint={`${b.name.endsWith('originals') ? 'File asli dari setiap upload, disimpan privat' : 'Foto yang dipakai website, dalam beberapa ukuran'} (R2 ${b.name})`}
              value={data ? bytes(b.bytes) : '…'}
            />
          ))}
        </ul>
      </AsideSection>
      <AsideSection title="Konten">
        <dl className="grid grid-cols-[1fr_auto_auto] gap-x-6 gap-y-3 text-sm">
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
            <Line key={k} label={label} a={data?.projects[k]} b={data?.articles[k]} />
          ))}
        </dl>
      </AsideSection>
    </>
  )
}

const dbLabel: Record<string, string> = {
  'kadanglabo-content': 'Data konten',
  'kadanglabo-media': 'Data foto',
  'kadanglabo-auth': 'Data akun',
}

const dbHint: Record<string, string> = {
  'kadanglabo-content': 'Projek, artikel, lokasi, dan pengaturan halaman',
  'kadanglabo-media': 'Data foto: ukuran, warna, dan pemakaian',
  'kadanglabo-auth': 'Akun pengguna dan sesi login',
}

const placeholder = {
  databases: ['kadanglabo-content', 'kadanglabo-media', 'kadanglabo-auth'].map((name) => ({ name, bytes: 0, limit: 1 })),
  buckets: ['kadanglabo-media', 'kadanglabo-originals'].map((name) => ({ name, bytes: 0, objects: 0 })),
}

function Row({ label, hint, value }: { label: string; hint: string; value: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className="flex min-w-0 flex-1 items-center gap-1.5 text-sm text-kumo-default">
        <span className="truncate">{label}</span>
        <Tooltip content={hint}>
          <Info size={13} className="shrink-0 text-kumo-inactive" />
        </Tooltip>
      </span>
      <span className="text-sm tabular-nums text-kumo-strong">{value}</span>
    </li>
  )
}

function Line({ label, a, b }: { label: string; a?: number; b?: number }) {
  return (
    <>
      <span className="text-kumo-subtle">{label}</span>
      <dd className="text-right tabular-nums">{a ?? '–'}</dd>
      <dd className="text-right tabular-nums">{b ?? '–'}</dd>
    </>
  )
}
