import { useEffect, useRef } from 'react'
import { phenomena } from '../lib/audio/phenomena'

/**
 * Live output spectrum. Drawn as a soft painted wave rather than a technical
 * bar chart, to sit with the illustrated cabinet — but it is the real analyser
 * data, not decoration.
 */
export function Spectrum({ accent = '#fcd34d' }: { accent?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let raf = 0
    let last = 0
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (now - last < 1000 / 30) return
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

      const data = phenomena.getFrequencyData()
      const bins = 48
      ctx.beginPath()
      for (let i = 0; i < bins; i++) {
        const v = data ? data[Math.floor((i / bins) * data.length * 0.55)] / 255 : 0.06
        const x = (i / (bins - 1)) * w
        const y = h - Math.max(2, v ** 1.5 * h)
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.lineTo(w, h)
      ctx.lineTo(0, h)
      ctx.closePath()
      const grad = ctx.createLinearGradient(0, 0, 0, h)
      grad.addColorStop(0, `${accent}cc`)
      grad.addColorStop(1, `${accent}12`)
      ctx.fillStyle = grad
      ctx.fill()
      ctx.strokeStyle = accent
      ctx.lineWidth = 1
      ctx.stroke()
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [accent])

  return <canvas ref={ref} className="h-full w-full" aria-hidden="true" />
}
