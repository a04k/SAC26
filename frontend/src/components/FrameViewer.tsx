import { Crosshair } from 'lucide-react'
import { api } from '../lib/api'
import { useUI } from '../lib/store'
import type { Features } from '../lib/types'

export function FrameViewer({
  id,
  short,
  features,
  accent,
}: {
  id: string
  short: string
  features: Features | null
  accent: string
}) {
  const showGrid = useUI((s) => s.showGrid)
  const toggleGrid = () => useUI.setState({ showGrid: !showGrid })
  const n = features?.grid_size ?? 8
  const centroid = features?.centroid

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
      <div className="flex items-center justify-between border-b border-white/5 px-2.5 py-1.5">
        <span className="text-[10px] uppercase tracking-[0.16em] text-white/40">Source frame</span>
        <button
          onClick={toggleGrid}
          aria-pressed={showGrid}
          className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] transition ${
            showGrid ? 'text-white' : 'text-white/35 hover:text-white/70'
          }`}
        >
          <Crosshair size={10} /> CV overlay
        </button>
      </div>
      <div className="relative aspect-square w-full">
        <img src={api.frameUrl(id)} alt={`NASA EIC frame for ${short}`} className="h-full w-full object-cover" />
        {showGrid && features && (
          <>
            <svg
              viewBox={`0 0 ${n} ${n}`}
              className="pointer-events-none absolute inset-0 h-full w-full"
              aria-hidden="true"
            >
              {Array.from({ length: n + 1 }).map((_, i) => (
                <g key={i} stroke="rgba(255,255,255,0.22)" strokeWidth={0.008}>
                  <line x1={i} y1={0} x2={i} y2={n} />
                  <line x1={0} y1={i} x2={n} y2={i} />
                </g>
              ))}
              {features.spatial_grid.map((v, i) => {
                const x = i % n
                const y = Math.floor(i / n)
                return (
                  <rect
                    key={i}
                    x={x}
                    y={y}
                    width={1}
                    height={1}
                    fill={accent}
                    opacity={v * 0.32}
                  />
                )
              })}
            </svg>
            {centroid && (
              <span
                className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
                style={{
                  left: `${centroid[0] * 100}%`,
                  top: `${centroid[1] * 100}%`,
                  borderColor: accent,
                  boxShadow: `0 0 12px ${accent}`,
                }}
                title="Luminance centroid — drives stereo position"
                aria-hidden="true"
              />
            )}
          </>
        )}
      </div>
      <div className="flex items-center justify-between px-2.5 py-1.5 text-[9px] text-white/30">
        <span>
          {features ? `${features.width}×${features.height} px` : 'loading…'}
        </span>
        <span>{features ? `${(features.edge_density * 100).toFixed(1)}% edges` : ''}</span>
      </div>
    </div>
  )
}
