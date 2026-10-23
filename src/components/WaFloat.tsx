import { useEffect, useState } from 'react'
import { tr } from '../lib/i18n'
import { waLink } from '../data/site'
import { WhatsApp } from './Icons'

/**
 * WhatsApp in the lower right corner (the category landing pages): an orange round button that shows once the hero
 * has been scrolled past, and steps aside while the inquiry form (#start) is on screen so it never covers "Send".
 * On hover it opens into a "Chat with us" capsule. The message is filled in for the page.
 */
export function WaFloat({ text }: { text: string }) {
  const [past, setPast] = useState(false)
  const [atForm, setAtForm] = useState(false)

  useEffect(() => {
    const update = () => setPast(window.scrollY > window.innerHeight * 0.6)
    update()
    window.addEventListener('scroll', update, { passive: true })
    const form = document.getElementById('start')
    const io = form ? new IntersectionObserver(([e]) => setAtForm(e.isIntersecting), { threshold: 0.05 }) : null
    if (form) io!.observe(form)
    return () => {
      window.removeEventListener('scroll', update)
      io?.disconnect()
    }
  }, [])

  const shown = past && !atForm

  return (
    <a
      href={waLink(text)}
      target="_blank"
      rel="noreferrer"
      className="wa-float"
      data-shown={shown ? '' : undefined}
      aria-label={tr('Chat with us on WhatsApp', 'Chat dengan kami via WhatsApp')}
    >
      <span className="wa-float__label">{tr('Chat with us', 'Chat dengan kami')}</span>
      <span className="wa-float__icon" aria-hidden="true">
        <WhatsApp />
      </span>
    </a>
  )
}
