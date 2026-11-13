import { useEffect, useRef } from 'react'
import { engine } from '../lib/audio/engine'
import type { Features } from '../lib/types'

const FPS = 30

function useCanvasDraw(draw: (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void, deps: unknown[] = []) {
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

export function Spectrum({ accent }: { accent: string }) {
  const ref = useCanvasDraw((ctx, w, h) => {
    const data = engine.getFrequencyData()
    if (!data) {
      ctx.fillStyle = 'rgba(255,255,255,0.14)'
      ctx.font = '11px ui-sans-serif'
      ctx.fillText('Press play to see the spectrum', 12, h / 2)
      return
    }
    const bins = 64
    const step = Math.floor((data.length * 0.62) / bins)
    const bw = w / bins
    for (let i = 0; i < bins; i++) {
      let sum = 0
      for (let j = 0; j < step; j++) sum += data[i * step + j]
      const v = sum / step / 255
      const bh = Math.max(2, v ** 1.5 * h)
      const grad = ctx.createLinearGradient(0, h, 0, h - bh)
      grad.addColorStop(0, accent)
      grad.addColorStop(1, '#ffffff')
      ctx.fillStyle = grad
      ctx.globalAlpha = 0.28 + v * 0.72
      ctx.fillRect(i * bw + 1, h - bh, bw - 2, bh)
    }
    ctx.globalAlpha = 1
  }, [accent])
  return <canvas ref={ref} className="h-full w-full" aria-hidden="true" />
}

export function Waveform({ accent }: { accent: string }) {
  const ref = useCanvasDraw((ctx, w, h) => {
    const data = engine.getTimeDomainData()
    ctx.strokeStyle = accent
    ctx.lineWidth = 1.6
    ctx.beginPath()
    if (!data) {
      ctx.moveTo(0, h / 2)
      ctx.lineTo(w, h / 2)
    } else {
      for (let i = 0; i < data.length; i++) {
        const x = (i / (data.length - 1)) * w
        const y = h / 2 + ((data[i] - 128) / 128) * (h / 2) * 0.94
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
    }
    ctx.stroke()
    ctx.globalAlpha = 0.16
    ctx.lineTo(w, h / 2)
    ctx.lineTo(0, h / 2)
    ctx.fillStyle = accent
    ctx.fill()
    ctx.globalAlpha = 1
  }, [accent])
  return <canvas ref={ref} className="h-full w-full" aria-hidden="true" />
}

export function Polar({ accent }: { accent: string }) {
  const ref = useCanvasDraw((ctx, w, h, t) => {
    const data = engine.getFrequencyData()
    const cx = w / 2
    const cy = h / 2
    const R = Math.min(w, h) / 2 - 8
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'
    for (let r = 0.25; r <= 1; r += 0.25) {
      ctx.beginPath()
      ctx.arc(cx, cy, R * r, 0, Math.PI * 2)
      ctx.stroke()
    }
    const spokes = 96
    for (let i = 0; i < spokes; i++) {
      const idx = Math.floor((i / spokes) * (data ? data.length * 0.55 : 1))
      const v = data ? data[idx] / 255 : 0.12 + 0.06 * Math.sin(i * 0.7 + t)
      const a = (i / spokes) * Math.PI * 2 - Math.PI / 2
      const len = R * (0.18 + v ** 1.3 * 0.82)
      ctx.strokeStyle = accent
      ctx.globalAlpha = 0.22 + v * 0.78
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(cx + Math.cos(a) * R * 0.16, cy + Math.sin(a) * R * 0.16)
      ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }, [accent])
  return <canvas ref={ref} className="h-full w-full" aria-hidden="true" />
}

export function Histogram({
  values,
  accent,
  label,
}: {
  values: number[]
  accent: string
  label: string
}) {
  const ref = useCanvasDraw((ctx, w, h) => {
    const max = Math.max(...values, 0.0001)
    const bw = w / values.length
    values.forEach((v, i) => {
      const bh = (v / max) * (h - 16)
      ctx.fillStyle = accent
      ctx.globalAlpha = 0.35 + (v / max) * 0.65
      ctx.fillRect(i * bw, h - bh, Math.max(1, bw - 1.5), bh)
    })
    ctx.globalAlpha = 0.85
    ctx.fillStyle = '#e2e8f0'
    ctx.font = '10px ui-sans-serif'
    ctx.fillText(label, 4, 12)
    ctx.globalAlpha = 1
  }, [values, accent, label])
  return <canvas ref={ref} className="h-full w-full" aria-hidden="true" />
}

export function SpatialGrid({ features, accent }: { features: Features; accent: string }) {
  const n = features.grid_size
  const ref = useCanvasDraw((ctx, w, h) => {
    const cell = Math.min(w, h) / n
    const level = engine.getLevel()
    const ox = (w - cell * n) / 2
    const oy = (h - cell * n) / 2
    features.spatial_grid.forEach((v, i) => {
      const x = ox + (i % n) * cell
      const y = oy + Math.floor(i / n) * cell
      ctx.fillStyle = accent
      ctx.globalAlpha = 0.08 + v * 0.72 + level * 0.3
      ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2)
    })
    ctx.globalAlpha = 0.24
    ctx.strokeStyle = '#ffffff'
    ctx.strokeRect(ox, oy, cell * n, cell * n)
    ctx.globalAlpha = 1
  }, [features, accent])
  return <canvas ref={ref} className="h-full w-full" aria-hidden="true" />
}

export function FeatureRadar({ features, accent }: { features: Features; accent: string }) {
  const values = [
    features.edge_density,
    features.entropy / 5,
    features.colorfulness / 120,
    features.mean_hsv[2] / 255,
    features.mean_hsv[1] / 255,
    features.fft_radial[features.fft_radial.length - 1] ?? 0,
    features.centroid[0],
  ]
  const labels = ['Edges', 'Entropy', 'Color', 'Bright', 'Sat', 'HiFreq', 'Pan']
  const ref = useCanvasDraw((ctx, w, h) => {
    const cx = w / 2
    const cy = h / 2 + 4
    const R = Math.min(w, h) / 2 - 18
    const n = values.length
    ctx.strokeStyle = 'rgba(255,255,255,0.09)'
    for (let ring = 1; ring <= 3; ring++) {
      ctx.beginPath()
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2
        const r = (R * ring) / 3
        const x = cx + Math.cos(a) * r
        const y = cy + Math.sin(a) * r
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    ctx.beginPath()
    values.forEach((v, i) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2
      const r = R * Math.min(1, Math.max(0.05, v))
      const x = cx + Math.cos(a) * r
      const y = cy + Math.sin(a) * r
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.closePath()
    ctx.fillStyle = accent
    ctx.globalAlpha = 0.22
    ctx.fill()
    ctx.globalAlpha = 0.95
    ctx.strokeStyle = accent
    ctx.lineWidth = 1.6
    ctx.stroke()
    ctx.globalAlpha = 0.7
    ctx.fillStyle = '#cbd5e1'
    ctx.font = '9px ui-sans-serif'
    labels.forEach((l, i) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2
      const x = cx + Math.cos(a) * (R + 11)
      const y = cy + Math.sin(a) * (R + 11)
      ctx.textAlign = 'center'
      ctx.fillText(l, x, y + 3)
    })
    ctx.globalAlpha = 1
  }, [features, accent])
  return <canvas ref={ref} className="h-full w-full" aria-hidden="true" />
}

export function NoteWaterfall({ accent }: { accent: string }) {
  const ref = useCanvasDraw((ctx, w, h) => {
    const notes = engine.getNotes()
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'
    for (let i = 0; i <= 8; i++) {
      const y = (i / 8) * h
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }
    for (const n of notes) {
      const x = ((n.age / 2.4) * 0.7 + ((n.pitch - 40) / 52) * 0.3) * w
      const y = (1 - n.pan / 2 - 0.5) * h
      const fade = Math.max(0, 1 - n.age / 2.4)
      ctx.fillStyle = n.kind === 'bass' ? '#a855f7' : n.kind === 'perc' ? '#f97316' : accent
      ctx.globalAlpha = fade * (0.4 + n.velocity * 0.6)
      const r = 1.5 + n.velocity * 2.5
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }, [accent])
  return <canvas ref={ref} className="h-full w-full" aria-hidden="true" />
}
