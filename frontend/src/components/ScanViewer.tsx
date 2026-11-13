import { useEffect, useRef } from 'react'
import { api } from '../lib/api'
import { player } from '../lib/audio/scanner'
import { useUI } from '../lib/store'
import type { Dataset } from '../lib/types'

/**
 * The source frame with the *actual scan line* drawn on it: 24 latitude bands,
 * the active band highlighted, its four sampled columns marked. This is the
 * literal thing the sonification is reading.
 */
export function ScanViewer({ dataset }: { dataset: Dataset }) {
  const showOverlay = useUI((s) => s.showOverlay)
  const bandRef = useRef<SVGRectElement>(null)
  const lineRef = useRef<SVGLineElement>(null)
  const labelRef = useRef<SVGTextElement>(null)
  const dotRefs = useRef<(SVGCircleElement | null)[]>([])

  useEffect(() => {
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const snap = player.getSnapshot()
      const active = snap.playing && snap.band >= 0
      const h = 24
      if (bandRef.current) {
        bandRef.current.style.opacity = active ? '0.28' : '0'
        bandRef.current.setAttribute('y', String((snap.band * 100) / h))
      }
      if (lineRef.current) {
        lineRef.current.style.opacity = active ? '0.95' : '0'
        lineRef.current.setAttribute('y1', String(((snap.band + 0.5) * 100) / h))
        lineRef.current.setAttribute('y2', String(((snap.band + 0.5) * 100) / h))
      }
      if (labelRef.current) {
        labelRef.current.textContent = active ? `${snap.bandLabel}` : ''
      }
      dotRefs.current.forEach((d, i) => {
        if (d) {
          d.style.opacity = active ? '1' : '0'
          d.setAttribute('cx', String([18, 39, 61, 82][i]))
          d.setAttribute('cy', String(((snap.band + 0.5) * 100) / h))
        }
      })
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-black/50">
      <div className="flex items-center justify-between border-b border-white/5 px-2.5 py-1.5">
        <span className="truncate text-[10px] uppercase tracking-[0.16em] text-white/45">
          Source frame · {dataset.sensor}
        </span>
        <label className="flex cursor-pointer items-center gap-1.5 text-[10px] text-white/45">
          <input
            type="checkbox"
            checked={showOverlay}
            onChange={(e) => useUI.setState({ showOverlay: e.target.checked })}
            className="h-3 w-3 accent-cyan-300"
          />
          scan overlay
        </label>
      </div>
      <div className="relative">
        <img
          src={api.frameUrl(dataset.id)}
          alt={`${dataset.title} — ${dataset.description}`}
          className="block w-full"
        />
        {showOverlay && (
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            {Array.from({ length: 25 }).map((_, i) => (
              <line
                key={i}
                x1={0}
                y1={(i * 100) / 24}
                x2={100}
                y2={(i * 100) / 24}
                stroke="rgba(255,255,255,0.16)"
                strokeWidth={0.15}
              />
            ))}
            <rect ref={bandRef} x={0} y={0} width={100} height={100 / 24} fill="#22d3ee" opacity={0} />
            <line ref={lineRef} x1={0} y1={0} x2={100} y2={0} stroke="#ffffff" strokeWidth={0.4} opacity={0} />
            {[18, 39, 61, 82].map((x, i) => (
              <circle
                key={x}
                ref={(el) => {
                  dotRefs.current[i] = el
                }}
                cx={x}
                cy={0}
                r={1.1}
                fill="#ffffff"
                opacity={0}
              />
            ))}
            <text ref={labelRef} x={2} y={6} fill="#ffffff" fontSize={3.2} opacity={0.9} />
          </svg>
        )}
      </div>
      <p className="px-2.5 py-1.5 text-[9px] leading-relaxed text-white/35">
        {dataset.source_frame}
      </p>
    </div>
  )
}
