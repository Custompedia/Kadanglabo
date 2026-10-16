type IconProps = { className?: string }

export function ArrowRight({ className }: IconProps) {
  return (
    <svg viewBox="0 0 40 32" className={className} aria-hidden="true" fill="none" stroke="currentColor">
      <path d="M2 16h34M22 2l14 14-14 14" strokeWidth="4" strokeLinejoin="miter" />
    </svg>
  )
}

export function ArrowUpRight({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor">
      <path d="M6 18L18 6M8 6h10v10" strokeWidth="1.8" />
    </svg>
  )
}

export function Plus({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor">
      <path d="M12 3v18M3 12h18" strokeWidth="1.6" />
    </svg>
  )
}

export function Search({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor">
      <circle cx="10.5" cy="10.5" r="6.5" strokeWidth="1.8" />
      <path d="M15.4 15.4L21 21" strokeWidth="1.8" />
    </svg>
  )
}

export function Instagram({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5" />
      <circle cx="12" cy="12" r="4.1" />
      <circle cx="17.3" cy="6.7" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function WhatsApp({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4.3 19.7l1.1-4A8.4 8.4 0 1 1 8.6 19l-4.3.7z" strokeLinejoin="round" />
      <path
        d="M9.2 8.4c.3-.6.7-.6 1-.6l.6.1c.2.4.6 1.5.7 1.7.1.2 0 .4-.1.6l-.5.6c-.1.2-.2.3 0 .6.5.9 1.4 1.8 2.4 2.3.3.1.4.1.6-.1l.6-.7c.2-.2.4-.2.6-.1l1.6.8c.2.1.3.2.3.4 0 .5-.3 1.3-1.1 1.6-.7.3-1.6.3-3.4-.6a8.4 8.4 0 0 1-3.6-3.6c-.6-1.3-.4-2.4.3-3z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  )
}

export function Mail({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5.5" width="18" height="13" rx="1.5" />
      <path d="M3.6 6.4l8.4 6.4 8.4-6.4" strokeLinejoin="round" />
    </svg>
  )
}

export function MapPin({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 21s-6.5-6.1-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.9 12 21 12 21z" strokeLinejoin="round" />
      <circle cx="12" cy="9.8" r="2.3" />
    </svg>
  )
}
