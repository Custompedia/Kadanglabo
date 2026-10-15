import { useEffect, useRef, useState } from 'react'
import { gsap, finePointer, reducedMotion } from '../lib/gsap'

/** Small follower dot; grows into a labelled disc over elements with data-cursor="Label". */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null)
  const [enabled] = useState(() => finePointer() && !reducedMotion())
  const [label, setLabel] = useState('')

  useEffect(() => {
    const el = dot.current
    if (!enabled || !el) return
    const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' })
    const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' })

    const move = (e: PointerEvent) => {
      xTo(e.clientX)
      yTo(e.clientY)
      el.dataset.visible = ''
    }
    const over = (e: PointerEvent) => {
      const target = e.target instanceof Element ? e.target : null
      const labelled = target?.closest<HTMLElement>('[data-cursor]')
      const text = labelled?.dataset.cursor ?? ''
      setLabel(text)
      el.toggleAttribute('data-label', !!text)
      el.toggleAttribute('data-link', !text && !!target?.closest('a, button, [role="button"], input, select, textarea'))
    }
    const leave = () => delete el.dataset.visible
    const down = () => el.toggleAttribute('data-down', true)
    const up = () => el.toggleAttribute('data-down', false)

    window.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('pointerover', over, { passive: true })
    document.documentElement.addEventListener('pointerleave', leave)
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      document.removeEventListener('pointerover', over)
      document.documentElement.removeEventListener('pointerleave', leave)
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
    }
  }, [enabled])

  if (!enabled) return null
  return (
    <div ref={dot} className="cursor" aria-hidden="true">
      <span className="cursor__label">{label}</span>
    </div>
  )
}
