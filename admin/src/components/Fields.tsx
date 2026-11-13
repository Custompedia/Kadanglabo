import { createContext, useContext, useState, type ReactNode } from 'react'
import { type Lang, type RichTx, type Tx } from '../../../shared/content'
import { Check, Eye, EyeSlash, MapPin, PencilSimple, X } from '@phosphor-icons/react'
import { RichEditor } from './RichEditor'

/*
 * Form fields for bilingual copy. Each shows the editor's EN | ID switch next to its label; it is one switch for
 * the whole editor.
 */

const LangCtx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: 'id', setLang: () => {} })
export const EditLangProvider = LangCtx.Provider

/** One language for the whole editor: switching it on any field switches every field, so they never disagree. */
function useFieldLang() {
  const { lang, setLang } = useContext(LangCtx)
  return [lang, setLang] as const
}

export function LangSwitch({ value, onChange, filled, size = 'sm' }: { value: Lang; onChange: (l: Lang) => void; filled?: { en: boolean; id: boolean }; size?: 'sm' | 'base' }) {
  return (
    <span className={`inline-flex rounded-lg bg-kumo-recessed p-0.5 ring-1 ring-kumo-hairline ${size === 'sm' ? 'text-xs' : 'text-sm'}`} role="tablist">
      {(['en', 'id'] as const).map((l) => (
        <button
          key={l}
          type="button"
          role="tab"
          aria-selected={value === l}
          onClick={() => onChange(l)}
          className={`flex items-center gap-1.5 rounded-md font-medium transition ${size === 'sm' ? 'px-2 py-0.5' : 'px-3 py-1'} ${value === l ? 'bg-kumo-base text-kumo-strong shadow-sm ring-1 ring-kumo-line' : 'text-kumo-subtle hover:text-kumo-default'}`}
        >
          {l.toUpperCase()}
          {filled && <span className={`size-1.5 rounded-full ${filled[l] ? 'bg-kumo-success' : 'bg-kumo-fill'}`} aria-label={filled[l] ? 'terisi' : 'kosong'} />}
        </button>
      ))}
    </span>
  )
}

/** Which language a bilingual field is showing (switched for the whole editor by the tabs under the title). */
function LangTag({ lang }: { lang: Lang }) {
  return <span className="rounded bg-kumo-recessed px-1.5 py-px text-[11px] font-semibold tracking-wide text-kumo-subtle" title={lang === 'id' ? 'Bahasa Indonesia' : 'English'}>{lang.toUpperCase()}</span>
}

/**
 * Which language the editor is filling in: one tab bar under the editor's title, always in view. An orange dot
 * marks a language that still has empty fields.
 */
export function LangTabs({ lang, setLang, issues = [] }: { lang: Lang; setLang: (l: Lang) => void; issues?: string[] }) {
  const missing = (l: Lang) => issues.some((i) => i.includes('Indonesia & Inggris') || i.includes(`bahasa ${l === 'id' ? 'Indonesia' : 'Inggris'} belum`))
  return (
    <div className="flex flex-wrap items-end gap-x-4 gap-y-2 border-b border-kumo-line" role="tablist" aria-label="Bahasa isian">
      {(
        [
          ['id', 'Bahasa Indonesia'],
          ['en', 'English'],
        ] as const
      ).map(([l, name]) => (
        <button
          key={l}
          type="button"
          role="tab"
          aria-selected={lang === l}
          onClick={() => setLang(l)}
          className={`-mb-px flex items-center gap-2 border-b-2 pb-2.5 text-sm transition ${lang === l ? 'border-kumo-brand font-medium text-kumo-strong' : 'border-transparent text-kumo-subtle hover:text-kumo-strong'}`}
        >
          <span className="rounded bg-kumo-recessed px-1.5 py-px text-[11px] font-semibold tracking-wide text-kumo-subtle">{l.toUpperCase()}</span>
          {name}
          {missing(l) && <span className="size-1.5 rounded-full bg-kumo-brand" title="Masih ada yang belum diisi" />}
        </button>
      ))}
      <span className="flex-1" />
      <span className="hidden pb-2.5 text-xs text-kumo-subtle sm:block">Isi kedua bahasa sebelum tayang</span>
    </div>
  )
}

export function FieldShell({ label, hint, right, children, required }: { label: ReactNode; hint?: ReactNode; right?: ReactNode; children: ReactNode; required?: boolean }) {
  return (
    <div className="grid gap-1.5">
      <div className="flex min-h-6 items-center justify-between gap-3">
        <span className="text-sm font-medium text-kumo-default">
          {label}
          {required && <span className="ml-0.5 text-kumo-subtle">*</span>}
        </span>
        {right}
      </div>
      {children}
      {hint && <p className="text-xs text-kumo-subtle">{hint}</p>}
    </div>
  )
}

const inputCls =
  'w-full rounded-lg bg-kumo-base px-3 text-[15px] text-kumo-default ring-1 ring-kumo-line outline-none transition placeholder:text-kumo-placeholder focus:ring-[1.5px] focus:ring-kumo-focus/60'

/** A short bilingual text (title, tagline, caption). `multiline` for a few sentences. */
export function TxField({ label, value, onChange, hint, placeholder, multiline, required, max, onRemove }: { label: ReactNode; value: Tx; onChange: (v: Tx) => void; hint?: ReactNode; placeholder?: Tx | string; multiline?: boolean; required?: boolean; max?: number; onRemove?: () => void }) {
  const [lang] = useFieldLang()
  const ph = typeof placeholder === 'string' ? placeholder : placeholder?.[lang]
  const v = value[lang]
  return (
    <FieldShell
      label={label}
      required={required}
      hint={hint}
      right={
        <span className="flex items-center gap-1.5">
          <LangTag lang={lang} />
          {onRemove && (
            <button type="button" onClick={onRemove} title="Hapus" aria-label={`Hapus ${typeof label === 'string' ? label.toLowerCase() : ''}`} className="grid size-7 place-items-center rounded-md text-kumo-subtle transition hover:bg-kumo-tint hover:text-kumo-default">
              <X size={14} weight="bold" />
            </button>
          )}
        </span>
      }
    >
      {multiline ? (
        <textarea lang={lang} className={`${inputCls} min-h-24 resize-y py-2.5 leading-relaxed`} value={v} placeholder={ph} maxLength={max} onChange={(e) => onChange({ ...value, [lang]: e.target.value })} />
      ) : (
        <input lang={lang} className={`${inputCls} h-10`} value={v} placeholder={ph} maxLength={max} onChange={(e) => onChange({ ...value, [lang]: e.target.value })} />
      )}
    </FieldShell>
  )
}

/** Formatted bilingual text (bold, italic, lists, links). */
export function RichField({ label, value, onChange, hint, placeholder, required }: { label: ReactNode; value: RichTx; onChange: (v: RichTx) => void; hint?: ReactNode; placeholder?: string; required?: boolean }) {
  const [lang] = useFieldLang()
  return (
    <FieldShell label={label} required={required} hint={hint} right={<LangTag lang={lang} />}>
      <RichEditor key={lang} lang={lang} value={value[lang]} placeholder={placeholder} onChange={(doc) => onChange({ ...value, [lang]: doc })} />
    </FieldShell>
  )
}

/** A plain single-language input with the same look. */
export function TextField({ label, value, onChange, hint, placeholder, required, prefix, type = 'text', right, list }: { label: ReactNode; value: string; onChange: (v: string) => void; hint?: ReactNode; placeholder?: string; required?: boolean; prefix?: string; type?: string; right?: ReactNode; list?: string }) {
  return (
    <FieldShell label={label} hint={hint} required={required} right={right}>
      <span className="flex items-stretch overflow-hidden rounded-lg ring-1 ring-kumo-line focus-within:ring-[1.5px] focus-within:ring-kumo-focus/60">
        {prefix && <span className="flex items-center bg-kumo-recessed px-3 text-sm text-kumo-subtle">{prefix}</span>}
        <input type={type} list={list} className="h-10 w-full min-w-0 bg-kumo-base px-3 text-[15px] outline-none placeholder:text-kumo-placeholder" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      </span>
    </FieldShell>
  )
}

/** A password, hidden by default, with an eye button to show what was typed (the same as on the sign-in page). */
export function PasswordField({ label, value, onChange, hint, autoComplete }: { label: ReactNode; value: string; onChange: (v: string) => void; hint?: ReactNode; autoComplete: 'current-password' | 'new-password' }) {
  const [show, setShow] = useState(false)
  return (
    <FieldShell label={label} hint={hint}>
      <span className="flex items-stretch overflow-hidden rounded-lg ring-1 ring-kumo-line focus-within:ring-[1.5px] focus-within:ring-kumo-focus/60">
        <input
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          className="h-10 w-full min-w-0 bg-kumo-base px-3 text-[15px] outline-none placeholder:text-kumo-placeholder"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="grid w-10 shrink-0 place-items-center bg-kumo-base text-kumo-subtle transition hover:bg-kumo-tint hover:text-kumo-default focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-kumo-focus"
          aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}
          aria-pressed={show}
        >
          {show ? <EyeSlash size={18} /> : <Eye size={18} />}
        </button>
      </span>
    </FieldShell>
  )
}

/**
 * A titled card that groups related fields in an editor. `where` says where on the website its fields show up
 * (with a link to the page when given), so nobody has to guess what a field changes.
 */
export function Section({ title, description, children, actions, id, n, where, href }: { title: ReactNode; description?: ReactNode; children: ReactNode; actions?: ReactNode; id?: string; n?: number; where?: ReactNode; href?: string }) {
  return (
    <section id={id} className="min-w-0 scroll-mt-6 rounded-xl bg-kumo-base ring-1 ring-kumo-line">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-kumo-hairline px-5 py-4">
        <div className="flex min-w-0 gap-3">
          {n !== undefined && <span className="mt-px grid size-6 shrink-0 place-items-center rounded-full bg-kumo-recessed text-xs font-semibold text-kumo-default ring-1 ring-kumo-hairline">{n}</span>}
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-kumo-strong">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-kumo-subtle">{description}</p>}
            {where && (
              <p className="mt-2 inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-md bg-kumo-recessed px-2 py-1 text-xs text-kumo-default">
                <MapPin size={13} weight="fill" className="text-kumo-brand" />
                <span className="text-kumo-subtle">Tampil di</span>
                {href ? (
                  <a href={href} target="_blank" rel="noreferrer" className="font-medium underline decoration-black/25 underline-offset-2 hover:decoration-black/60">
                    {where}
                  </a>
                ) : (
                  <span className="font-medium">{where}</span>
                )}
              </p>
            )}
          </div>
        </div>
        {actions}
      </header>
      <div className="grid min-w-0 gap-5 p-4 sm:p-5">{children}</div>
    </section>
  )
}

/** A straight line with a label between groups of sections ("Halaman detail projek", …). */
export function GroupDivider({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mt-4 first:mt-0">
      <div className="flex items-center gap-3">
        <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.08em] text-kumo-subtle">{children}</span>
        <span className="h-px flex-1 bg-kumo-line" />
      </div>
      {hint && <p className="mt-1.5 text-xs text-kumo-subtle">{hint}</p>}
    </div>
  )
}

/**
 * The page address (slug). Filled from the title by itself and shown locked; the pen opens it for editing (with
 * a check to keep and an X to undo), so nobody changes a live link by accident.
 */
export function SlugField({ label, prefix, value, onChange, hint, live }: { label: ReactNode; prefix: string; value: string; onChange: (v: string) => void; hint?: ReactNode; live?: boolean }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const clean = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100)
  const done = () => {
    const v = clean(draft)
    if (v) onChange(v)
    setEditing(false)
  }
  const iconBtn = 'grid size-8 shrink-0 place-items-center rounded-md text-kumo-subtle transition hover:bg-kumo-tint hover:text-kumo-default'
  return (
    <FieldShell label={label} hint={editing && live ? 'Sudah tayang: mengganti alamat membuat link lama tidak bisa dibuka lagi.' : hint}>
      <span className={`flex min-h-11 items-stretch overflow-hidden rounded-lg ring-1 ${editing ? 'ring-[1.5px] ring-kumo-focus/60' : 'ring-kumo-line'}`}>
        <span className="flex items-center bg-kumo-recessed px-3 text-sm text-kumo-subtle">{prefix}</span>
        {editing ? (
          <>
            <input
              autoFocus
              className="w-full min-w-0 bg-kumo-base px-3 text-[15px] outline-none"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.preventDefault(), done())
                if (e.key === 'Escape') setEditing(false)
              }}
            />
            <span className="flex items-center gap-0.5 bg-kumo-base pr-1">
              <button type="button" className={iconBtn} title="Simpan alamat" aria-label="Simpan alamat" onClick={done}>
                <Check size={16} weight="bold" />
              </button>
              <button type="button" className={iconBtn} title="Batal" aria-label="Batal ubah alamat" onClick={() => setEditing(false)}>
                <X size={15} weight="bold" />
              </button>
            </span>
          </>
        ) : (
          <>
            <span className={`flex min-w-0 flex-1 items-center truncate bg-kumo-recessed/50 px-3 text-[15px] ${value ? 'text-kumo-default' : 'text-kumo-placeholder'}`}>{value || 'terisi otomatis dari judul'}</span>
            <span className="flex items-center bg-kumo-recessed/50 pr-1">
              <button type="button" className={iconBtn} title="Ubah alamat" aria-label="Ubah alamat" onClick={() => (setDraft(value), setEditing(true))}>
                <PencilSimple size={16} />
              </button>
            </span>
          </>
        )}
      </span>
    </FieldShell>
  )
}
