import { MARK_PIECES, MARK_RING } from '../data/brandMark'

type Props = {
  className?: string
  ringColor?: string
  pieceColor?: string
  title?: string
}

/** The K mark as inline SVG so its parts can be animated (ring draws, pieces pop in). */
export function BrandMark({ className, ringColor = 'currentColor', pieceColor = '#EC6434', title }: Props) {
  return (
    <svg
      viewBox="-6 -6 342 336"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      <path
        className="bm-ring"
        d={MARK_RING}
        fill="none"
        stroke={ringColor}
        strokeWidth={8}
        strokeLinejoin="round"
        pathLength={1}
      />
      {MARK_PIECES.map((d, i) => (
        <path key={i} className="bm-piece" d={d} fill={pieceColor} />
      ))}
    </svg>
  )
}
