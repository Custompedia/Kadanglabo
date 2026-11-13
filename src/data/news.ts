import { locale } from '../lib/i18n'
import type { ArticleContent } from '../../shared/content'
import { articles } from './articles'

/*
 * Artikel bawaan (src/data/articles.ts): dipakai bila CMS tidak bisa dihubungi, dan untuk mengisi CMS pertama kali.
 * Judul dan tanggal di bawah ini adalah placeholder: ganti dengan artikel asli dari Kadanglabo sebelum website
 * dipublikasikan.
 * Semua teks dua bahasa ({ en, id }), dibaca lewat t() saat render (lib/i18n.ts).
 */

/** One article as the site shows it: banner, title and one formatted text. */
export type NewsItem = ArticleContent

export const news: NewsItem[] = [...articles]

const sortByDate = () => [...news].sort((a, b) => b.date.localeCompare(a.date))
export let sortedNews = sortByDate()

/** Swap in the articles published from the CMS (src/lib/content.ts); the list above stays as the fallback. */
export function setNews(next: NewsItem[]) {
  news.splice(0, news.length, ...next)
  sortedNews = sortByDate()
}

export const getNews = (slug: string) => news.find((n) => n.slug === slug)

/** "14 November 2026" / "14 November 2026", in the visitor's language. */
export const formatDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' })

/** Short month for the event badge ("Nov" / "Des"). */
export const formatMonth = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString(locale(), { month: 'short' })
