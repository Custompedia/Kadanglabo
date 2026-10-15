import type { CSSProperties, ReactNode } from 'react'

type Props = {
  title: ReactNode
  sub?: ReactNode
  theme?: 'light' | 'dark'
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

/** Big centred page title in the spirit of shed.design ("THE WORK", "CONTACT", …). */
export function PageHero({ title, sub, theme = 'light', className = '', style, children }: Props) {
  return (
    <section className={`page-hero wrap ${className}`} data-theme={theme} style={style}>
      <h1 className="t-display page-hero__title" data-split="now">
        {title}
      </h1>
      {sub && (
        <p className="t-serif page-hero__sub" data-fade="now" data-delay="0.45">
          {sub}
        </p>
      )}
      {children}
    </section>
  )
}
