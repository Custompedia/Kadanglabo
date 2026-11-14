import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { Button, Dialog } from '@cloudflare/kumo'
import { ArrowLeft, X } from '@phosphor-icons/react'

const desktopQuery = '(min-width: 1280px)'
const subscribeDesktop = (notify: () => void) => {
  const query = window.matchMedia(desktopQuery)
  query.addEventListener('change', notify)
  return () => query.removeEventListener('change', notify)
}

/*
 * One dashboard page: title (with an optional small pill next to it), a line of description, the main action on the
 * right, the content, and an optional right-hand side panel (an editor brings its Publikasi panel; storage and the
 * rest of the site's health live on the Monitoring page).
 */
export function Page({
  title,
  pill,
  description,
  actions,
  aside = false,
  children,
  wide,
  back,
  sticky,
  tabs,
  responsiveAside = false,
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
  /** Editors expose their existing publish panel in a dialog below the desktop breakpoint. */
  responsiveAside?: boolean
}) {
  const desktop = useSyncExternalStore(subscribeDesktop, () => window.matchMedia(desktopQuery).matches, () => true)
  const [asideOpen, setAsideOpen] = useState(false)
  const mobileAside = responsiveAside && !desktop && !!aside
  useEffect(() => { if (desktop) setAsideOpen(false) }, [desktop])
  return (
    <div className="admin-page flex min-h-full">
      <main className="min-w-0 flex-1 px-4 py-5 sm:py-8 sm:px-8 lg:px-10">
        {/* the page grows with the screen: laptops keep the reading width, large desktops use the room instead of leaving both sides empty */}
        <div className={`mx-auto ${wide ? 'max-w-[1240px] min-[1600px]:max-w-[1440px] min-[1900px]:max-w-[1640px] min-[2300px]:max-w-[1880px]' : 'max-w-[1060px] min-[1600px]:max-w-[1280px] min-[1900px]:max-w-[1480px] min-[2300px]:max-w-[1720px]'}`}>
        {back && (
          <a href={back.href} onClick={(ev) => (ev.preventDefault(), history.length > 1 ? history.back() : location.assign(back.href))} className="mb-2 inline-flex items-center gap-1 text-sm text-kumo-subtle transition hover:text-kumo-default">
            <ArrowLeft size={14} /> {back.label}
          </a>
        )}
        <div className={`mb-7 ${sticky ? 'sticky top-0 z-20 -mx-3 bg-kumo-canvas px-3 pt-3' : ''} ${sticky && !tabs ? 'pb-3' : ''}`}>
        <div className="flex flex-wrap items-start justify-between gap-4 md:flex-nowrap">
          <div className="min-w-0 flex-1">
            <div className={`flex items-center gap-2.5 ${sticky ? 'min-w-0 flex-nowrap' : 'flex-wrap'}`}>
              <h1 className={`break-words font-semibold tracking-tight text-kumo-strong ${sticky ? 'min-w-0 truncate text-[22px] leading-9' : 'text-[26px]'}`}>{title}</h1>
              {pill && <span className="shrink-0">{pill}</span>}
            </div>
            {description && <p className="mt-1.5 max-w-2xl text-[15px] text-kumo-subtle">{description}</p>}
          </div>
          {(actions || mobileAside) && <div className="admin-page-actions flex max-w-full shrink-0 flex-wrap items-center gap-2">
            {actions}
            {mobileAside && <Button variant="primary" onClick={() => setAsideOpen(true)}>Publikasi</Button>}
          </div>}
        </div>
        {tabs && <div className="mt-3">{tabs}</div>}
        </div>
        {children}
        </div>
      </main>
      {mobileAside ? (
        <Dialog.Root open={asideOpen} onOpenChange={setAsideOpen}>
          <Dialog size="lg" className="flex max-h-[90dvh] w-[min(560px,94vw)] max-w-none flex-col overflow-hidden p-0">
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-kumo-hairline px-5 py-4">
              <div>
                <Dialog.Title className="font-semibold">Publikasi</Dialog.Title>
                <Dialog.Description className="sr-only">Simpan, pratinjau, dan tayangkan konten.</Dialog.Description>
              </div>
              <Button variant="ghost" shape="square" aria-label="Tutup panel publikasi" onClick={() => setAsideOpen(false)} icon={<X size={18} />} />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{aside}</div>
          </Dialog>
        </Dialog.Root>
      ) : aside && (
        <aside className="admin-page-aside w-full shrink-0 border-t border-kumo-hairline bg-kumo-base xl:w-[300px] xl:border-l xl:border-t-0">
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
