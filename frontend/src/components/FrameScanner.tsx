import { useEffect, useState } from 'react'
import type { SpecCell } from '../lib/audio/phenomena'

/**
 * The measurement view.
 *
 * The NASA frame is shown untouched, with its real 6 × 12 measurement grid laid
 * over it. Each cell glows with the quantity that is *currently audible* for
 * the selected physical model — wind reads turbulence, fire reads hot pixels,
 * a storm reads cloud brightness — or with the live energy of the layer playing
 * at that moment. Hover a cell to read the numbers the synthesizer used.
 *
 * There is deliberately no scan line: the sound is not a sweep of the picture,
 * it is the picture's measured content driving a physical model.
 */
const MODEL_SIGNAL: Record<string, { key: keyof SpecCell; label: string }> = {
  wind: { key: 'turbulence', label: 'turbulence' },
  storm: { key: 'white', label: 'cloud fraction' },
  fire: { key: 'hot', label: 'hot fraction' },
  ocean: { key: 'water', label: 'water fraction' },
  city: { key: 'brightness', label: 'brightness' },
  canopy: { key: 'green', label: 'green fraction' },
  plume: { key: 'white', label: 'smoke fraction' },
  space: { key: 'brightness', label: 'brightness' },
}

export function FrameScanner({
  imageUrl,
  cells,
  cols,
  rows,
  model,
  energy,
}: {
  imageUrl: string
  cells: SpecCell[]
  cols: number
  rows: number
  model: string
  energy: Float32Array | null
}) {
  const [hover, setHover] = useState<SpecCell | null>(null)
  const [mode, setMode] = useState<'signal' | 'energy'>('signal')

  const signal = MODEL_SIGNAL[model] ?? MODEL_SIGNAL.plume

  useEffect(() => setHover(null), [imageUrl, model])

  return (
    <div className="overflow-hidden rounded-[18px] border-2 border-[#d8b077] bg-[#3a2716] shadow-[0_10px_24px_-16px_rgba(60,38,12,.9)]">
      <div className="flex flex-wrap items-center justify-between gap-1 border-b border-[#d8b077]/50 px-2 py-1.5">
        <span className="font-display text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#ffe9b8]">
          measured {cols}×{rows} = {cols * rows} cells
        </span>
        <div className="flex items-center gap-1">
          {(['signal', 'energy'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              aria-label={m === 'signal' ? `Show the measured ${signal.label} per cell` : 'Show the live level per cell'}
              aria-pressed={mode === m}
              className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider transition ${
                mode === m ? 'bg-[#ffe1a1] text-[#4a3521]' : 'text-[#ffe9b8]/60 hover:text-[#ffe9b8]'
              }`}
            >
              {m === 'signal' ? signal.label : 'live level'}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <img src={imageUrl} alt="" className="block w-full" draggable={false} />
        <div
          className="absolute inset-0 grid"
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
          }}
        >
          {cells.map((c) => {
            const value =
              mode === 'energy'
                ? Math.min(1, (energy?.[c.row * cols + c.col] ?? 0) * 1.4)
                : ((c[signal.key] as number) ?? 0)
            const isHover = hover?.row === c.row && hover?.col === c.col
            return (
              <button
                key={`${c.row}-${c.col}`}
                onMouseEnter={() => setHover(c)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(c)}
                onBlur={() => setHover(null)}
                aria-label={`Cell ${c.row + 1},${c.col + 1}: ${signal.label} ${value.toFixed(2)}, brightness ${c.brightness.toFixed(2)}`}
                className="relative border border-[#fff6dc]/15 outline-none transition focus-visible:ring-2 focus-visible:ring-[#ffe1a1]"
                style={{
                  background: `radial-gradient(circle at 50% 50%, rgba(255,${196 - value * 80},${
                    70 + value * 70
                  },${0.05 + value * 0.72}) 0%, rgba(255,140,50,0) 78%)`,
                  boxShadow: isHover ? 'inset 0 0 0 2px rgba(255,225,161,.95)' : undefined,
                }}
              >
                <span
                  className="pointer-events-none absolute inset-x-0 bottom-0 rounded-sm"
                  style={{ height: `${value * 100}%`, background: `rgba(255,214,140,${0.05 + value * 0.22})` }}
                />
              </button>
            )
          })}
        </div>

        {hover && (
          <div className="pointer-events-none absolute bottom-1 left-1 rounded-lg border border-[#d8b077]/60 bg-[#2b1d0f]/90 px-1.5 py-1 font-mono text-[8.5px] leading-relaxed text-[#ffe9b8] backdrop-blur">
            <div>
              cell {hover.row + 1},{hover.col + 1}
            </div>
            <div>brightness {hover.brightness.toFixed(2)}</div>
            <div>
              {signal.label} {(hover[signal.key] as number).toFixed(2)}
            </div>
            <div>hue {hover.hue.toFixed(0)}°</div>
          </div>
        )}
      </div>
    </div>
  )
}
