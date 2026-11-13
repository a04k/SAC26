/**
 * The Earth in `public/art/discs/earth.webp` is NASA's Blue Marble (Apollo 17
 * frame, SVS 12564 — the same published image), masked to a disc and rotated so
 * the African/Atlantic face used by the visualization is upright. We only ever
 * move it; the pixels are NASA's.
 */
export function EarthDisc({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <img
      src="/art/discs/earth.webp"
      alt=""
      aria-hidden
      draggable={false}
      className={className}
      style={style}
    />
  )
}
