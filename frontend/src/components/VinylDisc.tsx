import type { CSSProperties } from 'react'

/**
 * A record. The disc itself is CSS (matt black vinyl, concentric grooves, a
 * sheen that turns with the light); the centre label is the authentic NASA
 * frame for the track, cropped to a circle and served by the backend.
 *
 * Nothing here is a generated picture: grooves are gradients, the label is
 * `frame.png` from the bundled NASA asset set.
 */
export function VinylDisc({
  id,
  size,
  spinning = false,
  labelUrl,
  className = '',
  style,
  title,
}: {
  id: string
  size: number
  spinning?: boolean
  labelUrl: string
  className?: string
  style?: CSSProperties
  title?: string
}) {
  return (
    <div
      className={`disc ${className}`}
      style={{ ['--size' as string]: `${size}px`, ...style }}
      role="img"
      aria-label={title ? `Vinyl record: ${title}` : 'Vinyl record'}
    >
      <div className={`disc-grooves ${spinning ? 'disc-spin' : ''}`} data-disc={id}>
        <div className="disc-label">
          <img src={labelUrl} alt="" loading="lazy" draggable={false} />
        </div>
      </div>
      {/* the hole and sheen never rotate, so the disc reads as a physical object */}
      <div className="disc-hole" />
      <div className="disc-sheen" />
    </div>
  )
}
