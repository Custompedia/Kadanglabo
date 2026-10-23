import { useState, type FormEvent } from 'react'
import { waHello, waLink } from '../data/site'
import { t, tr, type Tx } from '../lib/i18n'
import { ArrowRight } from './Icons'

// the category names are the same in both languages (as on the Services pages)
const sectorsOpt = ['Commercial', 'Hospitality', 'Residential']
// stored by their English name, shown and sent in the visitor's language
const scopeOpt: Tx[] = [
  { en: 'New build', id: 'Bangunan baru' },
  { en: 'Renovation', id: 'Renovasi' },
  { en: 'Land development', id: 'Pengembangan lahan' },
  { en: 'Interior', id: 'Interior' },
]
const scopeName = (en: string) => t(scopeOpt.find((o) => o.en === en) ?? { en, id: en })

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
  scope: 'New build',
  location: '',
  area: '',
  message: '',
}

function compose(f: FormState) {
  const lines = [
    waHello(),
    '',
    `${tr('Name', 'Nama')}: ${f.name}`,
    `${tr('Contact', 'Kontak')}: ${f.contact}`,
    `${tr('Project type', 'Jenis proyek')}: ${f.sector}`,
    `${tr('Scope', 'Lingkup')}: ${scopeName(f.scope)}`,
  ]
  if (f.location) lines.push(`${tr('Location', 'Lokasi')}: ${f.location}`)
  if (f.area) lines.push(`${tr('Site area', 'Luas lahan')}: ${f.area}`)
  if (f.message) lines.push('', f.message)
  return lines.join('\n')
}

/** "Start a project": consultation & project inquiry. "Send" opens the studio chat with the message filled in (no backend needed). */
export function InquiryForm({ sector }: { sector?: 'Commercial' | 'Hospitality' | 'Residential' } = {}) {
  const [f, setF] = useState<FormState>(() => (sector ? { ...initial, sector } : initial))
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
        <legend className="field__label">{tr('Project type', 'Jenis proyek')}</legend>
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
        <legend className="field__label">{tr('Scope', 'Lingkup')}</legend>
        <div className="inquiry__chips">
          {scopeOpt.map((o) => (
            <label key={o.en} className="chip">
              <input type="radio" name="scope" value={o.en} checked={f.scope === o.en} onChange={() => set('scope')(o.en)} />
              <span>{t(o)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="inquiry__fields">
        <label className="field">
          <span className="field__label">{tr('Name', 'Nama')} *</span>
          <input
            required
            value={f.name}
            onChange={(e) => set('name')(e.target.value)}
            autoComplete="name"
            placeholder={tr('Full name', 'Nama lengkap')}
          />
        </label>
        <label className="field">
          <span className="field__label">{tr('WhatsApp number / email', 'No. WhatsApp / email')} *</span>
          <input
            required
            value={f.contact}
            onChange={(e) => set('contact')(e.target.value)}
            autoComplete="email"
            placeholder={tr('08xx or name@email.com', '08xx atau nama@email.com')}
          />
        </label>
        <label className="field">
          <span className="field__label">{tr('Project location', 'Lokasi proyek')}</span>
          <input value={f.location} onChange={(e) => set('location')(e.target.value)} placeholder={tr('City / regency', 'Kota / kabupaten')} />
        </label>
        <label className="field">
          <span className="field__label">{tr('Site area', 'Luas lahan')}</span>
          <input value={f.area} onChange={(e) => set('area')(e.target.value)} placeholder={tr('e.g. 250 m²', 'mis. 250 m²')} />
        </label>
        <label className="field field--wide">
          <span className="field__label">{tr('Tell us what you need', 'Ceritakan kebutuhan Anda')}</span>
          <textarea
            rows={5}
            value={f.message}
            onChange={(e) => set('message')(e.target.value)}
            placeholder={tr(
              'E.g. a two-storey home with three bedrooms, to build next year',
              'Mis. rumah dua lantai, tiga kamar tidur, ingin dibangun tahun depan',
            )}
          />
        </label>
      </div>

      <div className="inquiry__actions">
        <button type="submit" className="btn-pill btn-pill--orange btn-pill--lg">
          {tr('Send', 'Kirim')} <ArrowRight className="h-[0.8em] w-auto" />
        </button>
        <p className="inquiry__hint">* {tr('required', 'wajib diisi')}</p>
      </div>
      {sent && (
        <p className="inquiry__note" role="status">
          {tr('Thank you', 'Terima kasih')}
          {f.name.trim() ? `, ${f.name.trim().split(/\s+/)[0]}` : ''}!{' '}
          {tr(
            'Your message is ready in WhatsApp. Press send to share your plans with our team.',
            'Pesan Anda sudah siap di WhatsApp. Tekan kirim untuk menyampaikan rencana Anda kepada tim kami.',
          )}
        </p>
      )}
    </form>
  )
}
