/**
 * Two languages, English first. The choice is kept in localStorage (and can be forced with ?lang=id / ?lang=en).
 * Switching reloads the page (with the logo intro), so the language is fixed for a page load; still, call `t()` /
 * `tr()` while rendering rather than at module level, so copy always follows the stored choice.
 */
export type Lang = 'en' | 'id'
/** A piece of copy in both languages. */
export type Tx = { en: string; id: string }

const KEY = 'kadanglabo-lang'

function initial(): Lang {
  const q = new URLSearchParams(window.location.search).get('lang')
  if (q === 'en' || q === 'id') return q
  try {
    return localStorage.getItem(KEY) === 'id' ? 'id' : 'en'
  } catch {
    return 'en'
  }
}

const current: Lang = initial()
document.documentElement.lang = current

export const getLang = () => current

/** The current language's version of a bilingual text. */
export const t = (v: Tx) => v[current]

/** Inline copy: tr('English', 'Bahasa Indonesia'). */
export const tr = (en: string, id: string) => (current === 'id' ? id : en)

/**
 * Switch language: remember the choice and reload, so the page comes back with the full Kadanglabo logo intro.
 * A ?lang= in the address would override the stored choice, so it is replaced by the new one.
 */
export function reloadInLang(next: Lang) {
  if (next === current) return
  const url = new URL(window.location.href)
  url.searchParams.delete('lang')
  try {
    localStorage.setItem(KEY, next)
  } catch {
    url.searchParams.set('lang', next) // private mode: carry the choice in the address instead
  }
  // same address: reload (replace() with an unchanged URL and a #hash would only scroll)
  if (url.href === window.location.href) window.location.reload()
  else window.location.replace(url.href)
}

/** Locale for dates and numbers. */
export const locale = () => (current === 'id' ? 'id-ID' : 'en-GB')
