import { useState, type FormEvent } from 'react'
import { waLink } from '../data/site'
import { ArrowRight } from './Icons'

const sectorsOpt = ['Commercial', 'Hospitality', 'Residential']
const scopeOpt = ['Bangunan baru', 'Renovasi', 'Pengembangan lahan', 'Interior']

type FormState = {
  name: string
  contact: string
  sector: string
  scope: string
  location: string
  area: string
  message: string
}

const initial: FormState = {
  name: '',
  contact: '',
  sector: 'Residential',
  scope: 'Bangunan baru',
  location: '',
  area: '',
  message: '',
}

function compose(f: FormState) {
  const lines = [
    'Halo Kadanglabo, saya ingin konsultasi proyek.',
    '',
    `Nama: ${f.name}`,
    `Kontak: ${f.contact}`,
    `Jenis proyek: ${f.sector}`,
    `Lingkup: ${f.scope}`,
  ]
  if (f.location) lines.push(`Lokasi: ${f.location}`)
  if (f.area) lines.push(`Luas lahan: ${f.area}`)
  if (f.message) lines.push('', f.message)
  return lines.join('\n')
}

/** "Start a project": consultation & project inquiry. "Kirim" opens the studio chat with the message filled in (no backend needed). */
export function InquiryForm() {
  const [f, setF] = useState<FormState>(initial)
  const [sent, setSent] = useState(false)
  const set = (k: keyof FormState) => (v: string) => setF((s) => ({ ...s, [k]: v }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    window.open(waLink(compose(f)), '_blank', 'noopener,noreferrer')
    setSent(true)
  }

  return (
    <form className="inquiry" onSubmit={submit}>
      <fieldset className="inquiry__group">
        <legend className="field__label">Jenis proyek</legend>
        <div className="inquiry__chips">
          {sectorsOpt.map((o) => (
            <label key={o} className="chip">
              <input type="radio" name="sector" value={o} checked={f.sector === o} onChange={() => set('sector')(o)} />
              <span>{o}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="inquiry__group">
        <legend className="field__label">Lingkup</legend>
        <div className="inquiry__chips">
          {scopeOpt.map((o) => (
            <label key={o} className="chip">
              <input type="radio" name="scope" value={o} checked={f.scope === o} onChange={() => set('scope')(o)} />
              <span>{o}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="inquiry__fields">
        <label className="field">
          <span className="field__label">Nama *</span>
          <input required value={f.name} onChange={(e) => set('name')(e.target.value)} autoComplete="name" placeholder="Nama lengkap" />
        </label>
        <label className="field">
          <span className="field__label">No. WhatsApp / email *</span>
          <input required value={f.contact} onChange={(e) => set('contact')(e.target.value)} autoComplete="email" placeholder="08xx atau nama@email.com" />
        </label>
        <label className="field">
          <span className="field__label">Lokasi proyek</span>
          <input value={f.location} onChange={(e) => set('location')(e.target.value)} placeholder="Kota / kabupaten" />
        </label>
        <label className="field">
          <span className="field__label">Luas lahan</span>
          <input value={f.area} onChange={(e) => set('area')(e.target.value)} placeholder="mis. 250 m²" />
        </label>
        <label className="field field--wide">
          <span className="field__label">Ceritakan kebutuhan Anda</span>
          <textarea
            rows={5}
            value={f.message}
            onChange={(e) => set('message')(e.target.value)}
            placeholder="Mis. rumah dua lantai dengan tiga kamar, ingin mulai membangun tahun depan"
          />
        </label>
      </div>

      <div className="inquiry__actions">
        <button type="submit" className="btn-pill btn-pill--orange btn-pill--lg">
          Kirim <ArrowRight className="h-[0.8em] w-auto" />
        </button>
        <p className="inquiry__hint">* wajib diisi</p>
      </div>
      {sent && (
        <p className="inquiry__note" role="status">
          Terima kasih{f.name.trim() ? `, ${f.name.trim().split(/\s+/)[0]}` : ''}! Pesan Anda sudah siap di percakapan yang baru
          terbuka. Tinggal tekan kirim, tim kami akan segera membalas.
        </p>
      )}
    </form>
  )
}
