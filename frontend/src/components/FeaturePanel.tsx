import { ArrowRight, Eye, Info, Volume2 } from 'lucide-react'
import { useState } from 'react'
import type { Features, SonParams } from '../lib/types'

const FEATURE_LABELS: Record<string, string> = {
  edge_density: 'Edge density',
  gradient_mean: 'Gradient mean',
  texture_energy: 'Texture energy',
  entropy: 'Entropy',
  colorfulness: 'Colorfulness',
  sharpness: 'Sharpness',
  mean_hsv: 'Mean HSV',
  dominant_colors: 'Dominant colors',
  spatial_grid: 'Spatial grid',
}

export function FeaturePanel({
  features,
  params,
  mapping,
  accent,
}: {
  features: Features
  params: SonParams
  mapping: Record<string, string>
  accent: string
}) {
  const [tab, setTab] = useState<'mapping' | 'features'>('mapping')

  return (
    <div className="rounded-2xl border border-white/10 bg-[#080b16]/80 backdrop-blur-xl">
      <div className="flex items-center gap-1 border-b border-white/5 p-2">
        {(
          [
            ['mapping', 'Sight → Sound', <ArrowRight key="a" size={12} />],
            ['features', 'CV features', <Eye key="b" size={12} />],
          ] as const
        ).map(([key, label, icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium transition ${
              tab === key ? 'bg-white/10 text-white' : 'text-white/45 hover:text-white/80'
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {tab === 'mapping' ? (
        <div className="p-3">
          <ul className="flex flex-col gap-2">
            {Object.entries(mapping).map(([visual, audio]) => (
              <li key={visual} className="flex items-start gap-2 text-[11px]">
                <span className="flex w-[46%] shrink-0 items-start gap-1.5 text-white/65">
                  <Eye size={11} className="mt-0.5 shrink-0" style={{ color: accent }} />
                  {visual}
                </span>
                <ArrowRight size={11} className="mt-0.5 shrink-0 text-white/25" />
                <span className="flex-1 text-white/85">
                  <span className="flex items-start gap-1.5">
                    <Volume2 size={11} className="mt-0.5 shrink-0 text-white/40" />
                    {audio}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-start gap-1.5 rounded-lg border border-white/5 bg-white/[0.03] p-2 text-[10px] leading-relaxed text-white/45">
            <Info size={11} className="mt-0.5 shrink-0" />
            <span>
              Hue peaks pick the <strong className="text-white/70">root note</strong>; visual
              busyness sets <strong className="text-white/70">tempo &amp; density</strong>; the 8×8
              luminance grid pans notes left–right.
            </span>
          </div>
        </div>
      ) : (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 p-3 text-[10px]">
          {Object.entries(FEATURE_LABELS).map(([key, label]) => {
            const raw = (features as unknown as Record<string, unknown>)[key]
            let value = '—'
            if (typeof raw === 'number') value = raw.toFixed(3)
            else if (key === 'mean_hsv' && Array.isArray(raw))
              value = (raw as number[]).map((n) => Math.round(n)).join(', ')
            else if (key === 'dominant_colors' && Array.isArray(raw))
              value = `${(raw as unknown[]).length} clusters`
            else if (key === 'spatial_grid') value = `${features.grid_size}×${features.grid_size} cells`
            return (
              <div key={key} className="flex flex-col gap-0.5 rounded-lg bg-white/[0.03] px-2 py-1.5">
                <dt className="text-white/35">{label}</dt>
                <dd className="font-mono text-white/80">{value}</dd>
              </div>
            )
          })}
          <div className="col-span-2 flex items-center gap-1.5 rounded-lg bg-white/[0.03] px-2 py-1.5">
            <dt className="text-white/35">Palette</dt>
            <dd className="flex gap-1">
              {features.dominant_colors.map((c, i) => {
                const [b, g, r] = c.bgr
                return (
                  <span
                    key={i}
                    title={`${Math.round(c.share * 100)}%`}
                    className="h-3.5 w-3.5 rounded ring-1 ring-white/20"
                    style={{ background: `rgb(${r | 0}, ${g | 0}, ${b | 0})` }}
                  />
                )
              })}
            </dd>
          </div>
          <div className="col-span-2 flex flex-wrap gap-1">
            <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-white/60">
              root {params.root_note}
            </span>
            <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-white/60">
              {params.scale_name}
            </span>
            <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-white/60">
              {params.tempo} bpm
            </span>
            <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-white/60">
              busy {params.busyness.toFixed(2)}
            </span>
            <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-white/60">
              {features.width}×{features.height}
            </span>
          </div>
        </dl>
      )}
    </div>
  )
}
