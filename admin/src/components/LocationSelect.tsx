import { useState } from 'react'
import { Select } from '@cloudflare/kumo'
import { useFetch, mutate } from '../lib/useFetch'
import { EditDialog, type Area } from '../pages/Locations'
import { FieldShell } from './Fields'

const NEW = '__new__'
const NONE = '__none__'

/**
 * The project's city / regency, picked from the list kept on the Lokasi page ("Sleman · D.I. Yogyakarta"); the last
 * option adds a new one without leaving the editor. The area follows from the city.
 */
export function LocationSelect({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const { data, reload } = useFetch<{ areas: Area[] }>('/locations')
  const [adding, setAdding] = useState(false)
  const areas = data?.areas ?? []
  const items: Record<string, string> = { [NONE]: 'Belum diisi' }
  for (const a of areas) for (const c of a.cities) items[c.name] = `${c.name} · ${a.label}`
  // a name that is not (or no longer) in the list still shows, so nothing silently changes
  if (value && !items[value]) items[value] = `${value} · belum ada di daftar Lokasi`
  items[NEW] = '+ Tambah lokasi baru…'

  return (
    <FieldShell label="Lokasi (kota / kabupaten)" hint="Menentukan area di “Project locations” dan filter lokasi. Kelola daftarnya di menu Lokasi.">
      <Select
        aria-label="Lokasi"
        className="w-full"
        value={value ?? NONE}
        onValueChange={(v) => (v === NEW ? setAdding(true) : onChange(v === NONE ? null : String(v)))}
        items={items}
      />
      <EditDialog
        edit={adding ? { kind: 'city', areaId: areas[0]?.id ?? 0 } : null}
        areas={areas}
        onClose={() => setAdding(false)}
        onSaved={(name) => {
          void reload()
          mutate('/locations')
          if (name) onChange(name.trim())
        }}
      />
    </FieldShell>
  )
}
