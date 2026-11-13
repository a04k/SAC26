import { useEffect, useRef, useState } from 'react'
import { player } from '../lib/audio/scanner'
import type { BandRow } from '../lib/types'

const FPS = 30

function useCanvasDraw(
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void,
  deps: unknown[] = [],
) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    let raf = 0
    let last = 0
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (now - last < 1000 / FPS) return
      last = now
      const c = ref.current
      if (!c) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = c.clientWidth
      const h = c.clientHeight
      if (c.width !== w * dpr || c.height !== h * dpr) {
        c.width = w * dpr
        c.height = h * dpr
      }
      const ctx = c.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      draw(ctx, w, h, now / 1000)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return ref
}

/** Live output spectrum — what is actually reaching your ears. */
export function Spectrum({ accent = '#22d3ee' }: { accent?: string }) {
  const ref = useCanvasDraw((ctx, w, h) => {
    const data = player.getFrequencyData()
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    for (let i = 1; i < 4; i++) {
      const y = (i / 4) * h
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }
    if (!data) {
      ctx.fillStyle = 'rgba(255,255,255,0.2)'
      ctx.font = '10px ui-sans-serif'
      ctx.fillText('press play', 8, h / 2)
      return
    }
    const bins = 96
    const maxBin = Math.floor(data.length * 0.5)
    ctx.beginPath()
    for (let i = 0; i < bins; i++) {
      const v = data[Math.floor((i / bins) * maxBin)] / 255
      const x = (i / (bins - 1)) * w
      const y = h - Math.max(1, v ** 1.6 * h)
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.strokeStyle = accent
    ctx.lineWidth = 1.4
    ctx.stroke()
    ctx.lineTo(w, h)
    ctx.lineTo(0, h)
    ctx.closePath()
    ctx.fillStyle = `${accent}22`
    ctx.fill()
  }, [accent])
  return <canvas ref={ref} className="h-full w-full" aria-hidden="true" />
}

export function Waveform({ accent = '#22d3ee' }: { accent?: string }) {
  const ref = useCanvasDraw((ctx, w, h) => {
    const data = player.getTimeDomainData()
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.beginPath()
    ctx.moveTo(0, h / 2)
    ctx.lineTo(w, h / 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.strokeStyle = accent
    ctx.lineWidth = 1.2
    if (!data) {
      ctx.moveTo(0, h / 2)
      ctx.lineTo(w, h / 2)
    } else {
      for (let i = 0; i < data.length; i++) {
        const x = (i / (data.length - 1)) * w
        const y = h / 2 + ((data[i] - 128) / 128) * (h / 2) * 0.9
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
    }
    ctx.stroke()
  }, [accent])
  return <canvas ref={ref} className="h-full w-full" aria-hidden="true" />
}

/**
 * The scan itself: 24 stacked bands. Bar length = measured brightness,
 * opacity = edge/texture density, and the active band is outlined.
 */
export function BandProfile({ bands }: { bands: BandRow[] }) {
  const ref = useCanvasDraw((ctx, w, h) => {
    const snap = player.getSnapshot()
    const n = bands.length
    const rowH = h / n
    const labelW = 30
    bands.forEach((b, i) => {
      const y = i * rowH
      const len = (w - labelW - 4) * b.luminance
      ctx.fillStyle = b.luminance > 0.5 ? '#e8f4ff' : '#7dd3fc'
      ctx.globalAlpha = 0.25 + Math.min(0.7, b.edge * 6 + b.texture * 2)
      ctx.fillRect(labelW, y + 0.6, len, Math.max(1, rowH - 1.6))
      if (snap.playing && snap.band === i) {
        ctx.globalAlpha = 1
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 1
        ctx.strokeRect(labelW - 1, y + 0.3, w - labelW - 2, rowH - 0.6)
      }
    })
    ctx.globalAlpha = 0.55
    ctx.fillStyle = '#cbd5e1'
    ctx.font = `${Math.max(6, Math.min(8, rowH))}px ui-monospace`
    bands.forEach((b, i) => {
      if (i % 3 === 0) ctx.fillText(b.label, 0, i * rowH + rowH - 0.5)
    })
    ctx.globalAlpha = 1
  }, [bands])
  return <canvas ref={ref} className="h-full w-full" aria-hidden="true" />
}

/** Where the energy in each row sits across the band's own frequency content. */
export function RowSpectrum({ bands }: { bands: { band: number; energy: number[] }[] }) {
  const ref = useCanvasDraw((ctx, w, h) => {
    const snap = player.getSnapshot()
    const n = bands.length
    const cellW = w / (n || 1)
    bands.forEach((row, i) => {
      row.energy.forEach((e, k) => {
        ctx.fillStyle = ['#1e3a8a', '#0e7490', '#22d3ee', '#e0f2fe'][k]
        ctx.globalAlpha = 0.18 + e * 0.8
        const bh = (h / 4) * 0.92
        ctx.fillRect(i * cellW, k * (h / 4), Math.max(1, cellW - 0.8), bh)
      })
    })
    if (snap.playing && snap.band >= 0) {
      ctx.globalAlpha = 1
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 1
      ctx.strokeRect(snap.band * cellW, 0, cellW, h)
    }
    ctx.globalAlpha = 1
  }, [bands])
  return <canvas ref={ref} className="h-full w-full" aria-hidden="true" />
}

/** Pitch over time: the melody of brightness as the scan proceeds. */
export function PitchTrace({ tones }: { tones: { time: number; duration: number; freq: number }[] }) {
  const ref = useCanvasDraw((ctx, w, h) => {
    const snap = player.getSnapshot()
    const lo = 100
    const hi = 660
    const yOf = (f: number) => h - ((Math.log2(f) - Math.log2(lo)) / (Math.log2(hi) - Math.log2(lo))) * (h - 12) - 6
    // octave guides
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'
    ctx.fillStyle = 'rgba(255,255,255,0.22)'
    ctx.font = '8px ui-monospace'
    ;[110, 220, 440].forEach((f) => {
      const y = yOf(f)
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
      ctx.fillText(`${f}Hz`, 2, y - 2)
    })
    const total = tones.length ? tones[tones.length - 1].time + tones[tones.length - 1].duration : 1
    ctx.strokeStyle = '#a5f3fc'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    tones.forEach((t, i) => {
      const x = (t.time / total) * w
      const y = yOf(t.freq)
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.stroke()
    tones.forEach((t) => {
      const x = (t.time / total) * w
      ctx.fillStyle = '#e0f2fe'
      ctx.beginPath()
      ctx.arc(x, yOf(t.freq), 1.2, 0, Math.PI * 2)
      ctx.fill()
    })
    if (snap.duration) {
      const px = (snap.position / snap.duration) * w
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(px, 0)
      ctx.lineTo(px, h)
      ctx.stroke()
    }
  }, [tones])
  return <canvas ref={ref} className="h-full w-full" aria-hidden="true" />
}

/** Subscribe to the player at 10 Hz for DOM-rendered panels. */
export function usePlayerLabel(): { seriesLabel: string | null; band: number } {
  const [state, setState] = useState({ seriesLabel: null as string | null, band: -1 })
  useEffect(() => {
    const id = window.setInterval(() => {
      const s = player.getSnapshot()
      setState((prev) =>
        prev.seriesLabel === s.seriesLabel && prev.band === s.band
          ? prev
          : { seriesLabel: s.seriesLabel, band: s.band },
      )
    }, 100)
    return () => window.clearInterval(id)
  }, [])
  return state
}

export function SeriesStrip({
  steps,
}: {
  steps: { label: string; freq: number; relative_brightness?: number }[]
}) {
  const snapNow = usePlayerLabel()
  return (
    <div className="flex h-full flex-col justify-center gap-1 px-1">
      {steps.map((s) => {
        const active = snapNow.seriesLabel === s.label
        return (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className={`w-16 shrink-0 truncate text-[9px] ${active ? 'text-white' : 'text-white/40'}`}>
              {s.label}
            </span>
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-amber-300"
                style={{
                  width: `${Math.max(4, (s.relative_brightness ?? 0.5) * 100)}%`,
                  opacity: active ? 1 : 0.45,
                }}
              />
            </div>
            <span className="w-12 shrink-0 text-right font-mono text-[8.5px] text-white/35">
              {s.freq.toFixed(0)}Hz
            </span>
          </div>
        )
      })}
    </div>
  )
}
