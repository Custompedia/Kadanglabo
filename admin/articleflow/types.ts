/*
 * ArticleFlow: shared shapes. Pure types, no imports, so the Worker and the dashboard both read them.
 * The "Tech*" types are the Partner API contract (cms-partner/v1) served by Custompedia Tech.
 */

export type SubscriptionState = 'NONE' | 'ACTIVE' | 'EXPIRING' | 'EXPIRED'
/**
 * WITHDRAWN: Tech staff took the article off the website after it was published. Tech refuses publish and revision on
 * it; a newer version comes back as PENDING. A status this dashboard does not know yet is shown, never acted on.
 */
export type TechItemStatus = 'PENDING' | 'APPROVED' | 'CHANGES_REQUESTED' | 'UPDATING' | 'PUBLISHED' | 'WITHDRAWN'
export type TechLocale = 'id' | 'en'

export interface TechStatus {
  contractVersion: string
  siteId: string
  hostname: string
  serverTime: string
  subscription: { state: SubscriptionState; startsOn: string | null; endsOn: string | null; endsAt: string | null; totalDays: number | null; daysLeft: number | null }
  counts: { pending: number; approved: number; changes: number; published: number } | null
}

export interface TechTotals { clicks: number; impressions: number; ctr: number | null; position: number | null }
export interface TechAnalytics {
  connected: boolean
  window: { start: string; end: string } | null
  syncedThrough: string | null
  totals: TechTotals
  previous: TechTotals
  daily: { date: string; clicks: number; impressions: number }[]
  articles: { title: string; url: string; primaryQuery: string | null; publishedAt: string; clicks: number; impressions: number; position: number | null }[]
  queries: { query: string; clicks: number; impressions: number; position: number | null }[]
  published: { total: number; thisMonth: number }
  ai: { asked: number; mentioned: number } | null
}

export interface TechDecision { decision: 'APPROVED' | 'CHANGES_REQUESTED'; by: string; at: string; comment: string }
export interface TechItemLocale { locale: TechLocale; articleId: string; versionId: string; title: string; slug: string; status: TechItemStatus; publishedAt: string | null }
export interface TechItem {
  groupId: string
  status: TechItemStatus
  sentAt: string
  title: string
  excerpt: string
  primaryQuery: string | null
  why: string | null
  decision: TechDecision | null
  locales: TechItemLocale[]
  /** The other language's version is still being written or checked by Tech (status UPDATING): the item waits for it. */
  waitingFor?: TechLocale | null
}

/**
 * GET /articles. `removed`: groups that were sent here and whose every language has since been deleted in Tech (they
 * are no longer in `items`). Only these are deleted here: an article that is merely missing from `items` is not.
 */
export interface TechList { items: TechItem[]; removed?: { groupId: string; at: string }[] }

export type TechRun = { text: string; bold?: true; italic?: true; href?: string }
export type TechBlock =
  | { type: 'heading'; level: 2 | 3; text: string }
  | { type: 'paragraph'; runs: TechRun[] }
  | { type: 'list'; ordered: boolean; items: TechRun[][] }
  | { type: 'table'; caption: string; header: string[]; rows: string[][] }
  | { type: 'quote'; text: string; by: string | null }
  | { type: 'callout'; tone: 'NOTE' | 'WARNING' | 'TIP'; text: string }
  | { type: 'image'; assetId: string; alt: string; caption: string; layout: 'WIDE' | 'FULL' | null }
  | { type: 'cta'; label: string; href: string }
  | { type: 'divider' }
  | { type: 'code'; text: string }
  | { type: 'embed'; url: string; caption: string }

export interface TechAsset { assetId: string; alt: string; caption: string; width: number; height: number; format: 'webp' | 'jpeg' }
export interface TechVersion {
  locale: TechLocale
  articleId: string
  versionId: string
  slug: string
  title: string
  metaTitle: string
  metaDescription: string
  excerpt: string
  directAnswer: string
  /** Tech's own SEO cluster name: a hint for Tech, never a topic of this website (the client picks the topic here) */
  topic: string | null
  hero: { assetId: string; alt: string; caption: string } | null
  blocks: TechBlock[]
  assets: TechAsset[]
}
export interface TechDetail extends TechItem {
  history: TechDecision[]
  why_detail: { label: string; text: string }[]
  quality: { passed: boolean; notes: string[] } | null
  versions: TechVersion[]
}

/* ---- what the dashboard's own API (/api/articleflow) returns ---------------------------------------------------- */

/** Where an item stands on the Kadanglabo side. */
export type LocalState = 'none' | 'imported' | 'publishing' | 'finishing' | 'published' | 'taken_down'

/** One of the website's own article topics (Pengaturan topik), in both languages. */
export interface TopicTag { en: string; id: string }

export interface LocalInfo {
  state: LocalState
  /** the article in the normal Artikel menu, once it exists */
  articleId: number | null
  slug: string | null
  /** Tech sent a newer version than the one that is live here */
  newVersion: boolean
  /** only this language came from Tech; its text fills both languages */
  singleLang: TechLocale | null
  /** Tech asset id -> media id already uploaded here */
  assets: Record<string, string>
  /** the banner in Media, once the article was previewed */
  cover: string | null
  /** the website topic the article is filed under, once chosen here (Tech never chooses it) */
  tag: TopicTag | null
  /** when Tech took this article off the website (it was taken down here too), else null */
  withdrawnAt: string | null
}

/** What the page shows for an item: Tech's row plus the local state, folded into one simple status. */
export type ViewStatus = 'waiting' | 'approved' | 'changes' | 'updating' | 'finishing' | 'published' | 'taken_down' | 'withdrawn' | 'other'
export interface FlowItem extends TechItem { local: LocalInfo; view: ViewStatus }
export interface FlowDetail extends TechDetail { local: LocalInfo; view: ViewStatus }

/** Why Tech could not be read just now (null = fine). */
export type Trouble = 'not_configured' | 'unreachable' | 'unauthorized' | 'expired' | null

export interface FlowStatus {
  configured: boolean
  trouble: Trouble
  /** the answer comes from the last good read, not from Tech just now */
  stale: boolean
  fetchedAt: string | null
  status: TechStatus | null
  /** locked = no subscription or expired: only the status is readable */
  locked: boolean
  /** follow-ups still being finished in the background */
  pendingJobs: number
  /** where "Hubungi tim Custompedia" leads (worker var ARTICLEFLOW_CONTACT_URL), if set */
  contactUrl: string | null
}

export interface FlowOverview extends FlowStatus {
  analytics: TechAnalytics | null
  items: FlowItem[]
}

export interface ImportResult {
  previewUrl: string
  /** what still stops the draft and only Tech can fix; the topic is picked here and is not listed (see local.tag) */
  issues: string[]
  singleLang: TechLocale | null
  local: LocalInfo
}
export interface PublishResult { state: 'published' | 'finishing'; articleId: number | null; slug: string | null; url: string | null }
