/**
 * Disc choreography.
 *
 * When a record is chosen the disc physically travels: out of the crate, up
 * into the glass dome, into its cradle. It is one DOM node built from the same
 * CSS as `VinylDisc` (so the label is the track's real NASA frame) animated with
 * the Web Animations API along an arc — no libraries, and it is skipped entirely
 * when the user prefers reduced motion.
 */

export interface FlightOptions {
  from: DOMRect
  to: DOMRect
  labelUrl: string
  /** ms */
  duration?: number
  /** arc height in px */
  lift?: number
  z?: number
}

function node(labelUrl: string, base: number) {
  const el = document.createElement('div')
  el.className = 'disc'
  el.style.cssText = `position:fixed;left:0;top:0;width:${base}px;height:${base}px;pointer-events:none;z-index:70;will-change:transform;transform-origin:50% 50%`
  el.innerHTML = `
    <div class="disc-grooves">
      <div class="disc-label"><img src="${labelUrl}" alt="" style="width:100%;height:100%;object-fit:cover" /></div>
    </div>
    <div class="disc-hole"></div>
    <div class="disc-sheen"></div>`
  return el
}

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function flyDisc({
  from,
  to,
  labelUrl,
  duration = 820,
  lift = 90,
  z = 70,
}: FlightOptions): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve()
  const base = 220
  const el = node(labelUrl, base)
  el.style.zIndex = String(z)
  document.body.appendChild(el)

  const s0 = from.width / base
  const s1 = to.width / base
  const x0 = from.left + from.width / 2 - base / 2
  const y0 = from.top + from.height / 2 - base / 2
  const x1 = to.left + to.width / 2 - base / 2
  const y1 = to.top + to.height / 2 - base / 2

  if (prefersReducedMotion()) {
    el.remove()
    return Promise.resolve()
  }

  const mid = 0.52
  const anim = el.animate(
    [
      { transform: `translate(${x0}px, ${y0}px) scale(${s0}) rotate(0deg)`, offset: 0 },
      {
        transform: `translate(${x0 + (x1 - x0) * mid}px, ${y0 + (y1 - y0) * mid - lift}px) scale(${(s0 + s1) / 2 * 1.12}) rotate(160deg)`,
        offset: mid,
      },
      { transform: `translate(${x1}px, ${y1}px) scale(${s1}) rotate(400deg)`, offset: 1 },
    ],
    { duration, easing: 'cubic-bezier(.34,.72,.18,1)', fill: 'forwards' },
  )

  return anim.finished.then(
    () => {
      el.remove()
    },
    () => {
      el.remove()
    },
  )
}
