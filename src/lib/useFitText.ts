import { useLayoutEffect, type RefObject } from 'react'

/**
 * Scales a single-line element's font-size so it exactly fills its parent's content width.
 * The element should be `white-space: nowrap; display: inline-block|inline-flex`.
 */
export function useFitText(ref: RefObject<HTMLElement | null>, { max = 2000, min = 12 } = {}) {
  useLayoutEffect(() => {
    const el = ref.current
    const parent = el?.parentElement
    if (!el || !parent) return

    const fit = () => {
      const cs = getComputedStyle(parent)
      const avail = parent.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
      el.style.fontSize = '100px'
      const natural = el.scrollWidth
      if (!natural) return
      const size = Math.max(min, Math.min(max, (100 * avail) / natural))
      el.style.fontSize = `${Math.floor(size * 100) / 100}px`
    }

    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(parent)
    document.fonts?.ready.then(fit)
    return () => ro.disconnect()
  }, [ref, max, min])
}
