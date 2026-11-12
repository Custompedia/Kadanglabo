import type { ReactNode } from 'react'
import { ArrowLeft } from '@phosphor-icons/react'
import { StoragePanel } from './StoragePanel'

/*
 * One dashboard page: title (with an optional small pill next to it), a line of description, the main action on the
 * right, the content, and the right-hand side panel (Storage by default; an editor brings its own).
 */
export function Page({
  title,
  pill,
  description,
  actions,
  aside = <StoragePanel />,
  children,
  wide,
  back,
  sticky,
  tabs,
}: {
  title: ReactNode
  pill?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  aside?: ReactNode | false
  children: ReactNode
  wide?: boolean
  /** a link back to the list, shown above the title */
  back?: { label: string; href: string }
  /** keep the title bar (and its actions) in view while scrolling: for the long editors */
  sticky?: boolean
  /** a tab bar under the title (inside the sticky bar), e.g. the language an editor is filled in */
  tabs?: ReactNode
}) {
  return (
    <div className="flex min-h-full">
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:px-10">
        <div className={`mx-auto ${wide ? 'max-w-[1240px]' : 'max-w-[1060px]'}`}>
        {back && (
          <a href={back.href} onClick={(ev) => (ev.preventDefault(), history.length > 1 ? history.back() : location.assign(back.href))} className="mb-2 inline-flex items-center gap-1 text-sm text-kumo-subtle transition hover:text-kumo-default">
            <ArrowLeft size={14} /> {back.label}
          </a>
        )}
        <div className={`mb-7 ${sticky ? 'sticky top-0 z-20 -mx-3 bg-kumo-canvas px-3 pt-3' : ''} ${sticky && !tabs ? 'pb-3' : ''}`}>
        <div className="flex flex-wrap items-start justify-between gap-4 md:flex-nowrap">
          <div className="min-w-0 flex-1">
            <div className={`flex items-center gap-2.5 ${sticky ? 'min-w-0 flex-nowrap' : 'flex-wrap'}`}>
              <h1 className={`font-semibold tracking-tight text-kumo-strong ${sticky ? 'min-w-0 truncate text-[22px] leading-9' : 'text-[26px]'}`}>{title}</h1>
              {pill && <span className="shrink-0">{pill}</span>}
            </div>
            {description && <p className="mt-1.5 max-w-2xl text-[15px] text-kumo-subtle">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
        {tabs && <div className="mt-3">{tabs}</div>}
        </div>
        {children}
        </div>
      </main>
      {aside && (
        <aside className="hidden w-[300px] shrink-0 border-l border-kumo-hairline bg-kumo-base xl:block">
          {/* its own scroll, as tall as the screen: everything in the panel is reachable without scrolling the page to the end */}
          <div className="no-scrollbar sticky top-0 max-h-[calc(100dvh-58px)] overflow-y-auto overscroll-contain">{aside}</div>
        </aside>
      )}
    </div>
  )
}

/** A titled section of the side panel, divided from the next by a hairline. */
export function AsideSection({ title, extra, children }: { title: ReactNode; extra?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-b border-kumo-hairline px-6 py-6 first:pt-10 last:border-b-0">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-kumo-strong">{title}</h2>
        {extra && <span className="text-xs text-kumo-subtle">{extra}</span>}
      </div>
      {children}
    </section>
  )
}
