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
