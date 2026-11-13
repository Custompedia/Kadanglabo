import { useState, type FormEvent } from 'react'
import { useToasts } from '../components/Toaster'
import { Button, Dialog, LayerCard, Loader, Select, Tooltip } from '@cloudflare/kumo'
import { MapPin, PencilSimple, Plus, Trash, Warning } from '@phosphor-icons/react'
import { Page } from '../layout/Page'
import { api, ApiError } from '../lib/api'
import { mutate, useFetch } from '../lib/useFetch'
import { FieldShell, TextField } from '../components/Fields'

/*
 * The locations projects pick from: areas (shown under "Project locations" on Our Work and in the Location filter)
 * holding cities / regencies (shown in the archive table). Renaming a city updates every project that uses it; a
 * place still in use cannot be deleted, and the projects using it are listed.
 */

export interface City {
  id: number
  name: string
  usedBy: string[]
}
export interface Area {
  id: number
  key: string
  label: string
  cities: City[]
}

type Edit = { kind: 'area'; area?: Area } | { kind: 'city'; city?: City; areaId: number } | null

export default function Locations() {
  const toasts = useToasts()
  const { data, reload } = useFetch<{ areas: Area[] }>('/locations')
  const [edit, setEdit] = useState<Edit>(null)
  const [blocked, setBlocked] = useState<{ title: string; message: string; usedBy?: string[] } | null>(null)

  async function remove(path: string, name: string) {
    try {
      await api(path, { method: 'DELETE' })
      toasts.add({ title: `“${name}” dihapus`, variant: 'success' })
      void reload()
      mutate('/locations')
    } catch (e) {
      const err = e as ApiError
      if (err.code === 'in_use' || err.code === 'not_empty') setBlocked({ title: `“${name}” belum bisa dihapus`, message: err.message, usedBy: err.data.usedBy as string[] | undefined })
      else toasts.add({ title: 'Gagal', description: err.message, variant: 'error' })
    }
  }

  return (
    <Page
      title="Lokasi"
      description="Daftar lokasi yang dipilih di setiap projek. Area tampil di bagian “Project locations” di Our Work dan di filter lokasi arsip; kota atau kabupaten tampil di kolom Lokasi tabel arsip."
      actions={
        <Button variant="primary" icon={Plus} onClick={() => setEdit({ kind: 'area' })}>
          Tambah area
        </Button>
      }
    >
      {!data ? (
        <div className="grid place-items-center py-24">
          <Loader />
        </div>
      ) : (
        <div className="grid gap-4">
          {data.areas.map((a) => {
            const used = new Set(a.cities.flatMap((c) => c.usedBy)).size
            return (
              <LayerCard key={a.id} className="p-0">
                <LayerCard.Secondary className="flex flex-wrap items-center gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="text-[15px] font-semibold text-kumo-strong">{a.label}</span>
                    <span className="ml-2 text-xs font-normal text-kumo-subtle">
                      {a.cities.length} kota · {used} projek
                    </span>
                  </span>
                  <Button size="sm" icon={Plus} onClick={() => setEdit({ kind: 'city', areaId: a.id })}>
                    Kota
                  </Button>
                  <IconBtn label={`Ubah nama ${a.label}`} onClick={() => setEdit({ kind: 'area', area: a })} icon={<PencilSimple size={15} />} />
                  <IconBtn label={`Hapus ${a.label}`} onClick={() => void remove(`/locations/areas/${a.id}`, a.label)} icon={<Trash size={15} />} />
                </LayerCard.Secondary>
                <LayerCard.Primary className="p-0">
                  {a.cities.length === 0 ? (
                    <p className="px-5 py-5 text-sm text-kumo-subtle">Belum ada kota di area ini.</p>
                  ) : (
                    <ul className="divide-y divide-kumo-hairline">
                      {a.cities.map((c) => (
                        <li key={c.id} className="admin-location-row flex flex-wrap items-center gap-2 px-3 py-2.5 sm:px-5">
                          <MapPin size={16} className="text-kumo-subtle" />
                          <span className="min-w-0 flex-1 break-words text-sm text-kumo-strong">{c.name}</span>
                          {c.usedBy.length > 0 ? (
                            <Tooltip content={c.usedBy.join(', ')}>
                              <span className="cursor-default text-xs text-kumo-subtle underline decoration-dotted underline-offset-2">dipakai {c.usedBy.length} projek</span>
                            </Tooltip>
                          ) : (
                            <span className="text-xs text-kumo-inactive">belum dipakai</span>
                          )}
                          <IconBtn label={`Ubah ${c.name}`} onClick={() => setEdit({ kind: 'city', city: c, areaId: a.id })} icon={<PencilSimple size={15} />} />
                          <IconBtn label={`Hapus ${c.name}`} onClick={() => void remove(`/locations/cities/${c.id}`, c.name)} icon={<Trash size={15} />} />
                        </li>
                      ))}
                    </ul>
                  )}
                </LayerCard.Primary>
              </LayerCard>
            )
          })}
        </div>
      )}

      <EditDialog edit={edit} areas={data?.areas ?? []} onClose={() => setEdit(null)} onSaved={() => (void reload(), mutate('/locations'))} />

      <Dialog.Root open={!!blocked} onOpenChange={(o) => !o && setBlocked(null)}>
        <Dialog size="base" className="p-6">
          <Dialog.Title className="flex items-center gap-2 text-lg font-semibold text-kumo-strong">
            <Warning size={20} className="text-kumo-warning" /> {blocked?.title}
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-kumo-subtle">{blocked?.message}</Dialog.Description>
          {blocked?.usedBy && (
            <ul className="mt-3 max-h-48 list-disc space-y-0.5 overflow-y-auto pl-5 text-sm text-kumo-default">
              {blocked.usedBy.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          )}
          <div className="mt-6 flex justify-end">
            <Button variant="primary" onClick={() => setBlocked(null)}>
              Mengerti
            </Button>
          </div>
        </Dialog>
      </Dialog.Root>
    </Page>
  )
}

const IconBtn = ({ label, onClick, icon }: { label: string; onClick: () => void; icon: React.ReactNode }) => (
  <button type="button" onClick={onClick} aria-label={label} title={label} className="grid size-8 place-items-center rounded-md text-kumo-subtle transition hover:bg-kumo-tint hover:text-kumo-default">
    {icon}
  </button>
)

/** Add or rename an area; add, rename or move a city. */
export function EditDialog({ edit, areas, onClose, onSaved }: { edit: Edit; areas: Area[]; onClose: () => void; onSaved: (name?: string) => void }) {
  const toasts = useToasts()
  const [name, setName] = useState('')
  const [areaId, setAreaId] = useState(0)
  const [busy, setBusy] = useState(false)
  const [key, setKey] = useState('')
  const k = edit ? `${edit.kind}${edit.kind === 'area' ? edit.area?.id ?? 'new' : edit.city?.id ?? 'new'}` : ''
  if (k !== key) {
    setKey(k)
    if (edit) {
      setName(edit.kind === 'area' ? edit.area?.label ?? '' : edit.city?.name ?? '')
      setAreaId(edit.kind === 'city' ? edit.areaId : 0)
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!edit) return
    setBusy(true)
    try {
      if (edit.kind === 'area') {
        if (edit.area) await api(`/locations/areas/${edit.area.id}`, { method: 'PATCH', body: { label: name } })
        else await api('/locations/areas', { body: { label: name } })
      } else if (edit.city) await api(`/locations/cities/${edit.city.id}`, { method: 'PATCH', body: { name, area_id: areaId } })
      else await api('/locations/cities', { body: { name, area_id: areaId } })
      const renamed = edit.kind === 'city' && edit.city && edit.city.name !== name && edit.city.usedBy.length
      toasts.add({ title: 'Tersimpan', description: renamed ? `${edit.city!.usedBy.length} projek ikut memakai nama baru.` : undefined, variant: 'success' })
      onSaved(name)
      onClose()
    } catch (err) {
      toasts.add({ title: 'Gagal', description: (err as ApiError).message, variant: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const isArea = edit?.kind === 'area'
  const editing = edit && (edit.kind === 'area' ? !!edit.area : !!edit.city)
  return (
    <Dialog.Root open={!!edit} onOpenChange={(o) => !o && onClose()}>
      <Dialog size="base" className="p-6">
        <Dialog.Title className="text-lg font-semibold text-kumo-strong">{isArea ? (editing ? 'Ubah area' : 'Area baru') : editing ? 'Ubah kota / kabupaten' : 'Kota / kabupaten baru'}</Dialog.Title>
        {edit?.kind === 'city' && edit.city && edit.city.usedBy.length > 0 && (
          <Dialog.Description className="mt-1 text-sm text-kumo-subtle">Dipakai {edit.city.usedBy.length} projek; semuanya ikut berubah.</Dialog.Description>
        )}
        <form onSubmit={submit} className="mt-5 grid gap-4">
          <TextField label={isArea ? 'Nama area' : 'Nama kota / kabupaten'} required value={name} onChange={setName} placeholder={isArea ? 'mis. Jawa Tengah' : 'mis. Magelang'} />
          {!isArea && (
            <FieldShell label="Masuk area" hint="Menentukan di area mana kota ini dihitung pada bagian “Project locations”.">
              <Select aria-label="Area" className="w-full" value={String(areaId)} onValueChange={(v) => setAreaId(Number(v))} items={Object.fromEntries(areas.map((a) => [String(a.id), a.label]))} />
            </FieldShell>
          )}
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" variant="primary" loading={busy} disabled={name.trim().length < 2 || (!isArea && !areaId)}>
              Simpan
            </Button>
          </div>
        </form>
      </Dialog>
    </Dialog.Root>
  )
}
