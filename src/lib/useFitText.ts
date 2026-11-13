import { useLayoutEffect, type RefObject } from 'react'

/**
 * Scales a single-line element's font-size so it exactly fills its parent's content width.
 * The element should be `white-space: nowrap; display: inline-block|inline-flex`.
 *
 * Every fit lays the page out twice (measure at 100px, then the real size), so it only runs again when the result
 * could differ: the parent's width changed, or the fonts were still loading the last time it measured.
 */
export function useFitText(ref: RefObject<HTMLElement | null>, { max = 2000, min = 12 } = {}) {
  useLayoutEffect(() => {
    const el = ref.current
    const parent = el?.parentElement
    if (!el || !parent) return

    let fittedTo = -1 // the parent's content width at the last fit
    let fontsSettled = false // the fonts were all loaded when it measured

    const fit = () => {
      const cs = getComputedStyle(parent)
      const avail = parent.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
      el.style.fontSize = '100px'
      const natural = el.scrollWidth
      if (!natural) return
      fittedTo = avail
      fontsSettled = document.fonts?.status === 'loaded'
      const size = Math.max(min, Math.min(max, (100 * avail) / natural))
      el.style.fontSize = `${Math.floor(size * 100) / 100}px`
    }

    fit()
    // the observer's first report (and any later one) carries the content width, so an unchanged width costs nothing
    let observed = -1
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width
      const first = observed < 0
      if (w === observed) return
      observed = w
      // (the first report only confirms the width measured above; clientWidth is whole pixels, hence the tolerance)
      if (first && Math.abs(w - fittedTo) < 1) return
      fit()
    })
    ro.observe(parent)
    document.fonts?.ready.then(() => {
      if (!fontsSettled) fit()
    })
    return () => ro.disconnect()
  }, [ref, max, min])
}
