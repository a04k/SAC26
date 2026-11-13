import { useEffect, useRef } from 'react'
import { phenomena } from '../lib/audio/phenomena'

/**
 * The live output spectrum of the synthesizer.
 *
 * This is a meter, not an analysis: it is read straight off the Web Audio
 * analyser while the engine is running, so it can only ever show the sound the
 * browser is actually making. When the transport is stopped there is no signal
 * and the component says so — it does not draw a decorative idle shape.
 */
export function Spectrum({
  accent = '#fcd34d',
  label = 'no signal — the transport is stopped',
}: {
  accent?: string
  label?: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const emptyRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    let raf = 0
    let last = 0
    // measured in Hz: 2048-point FFT over a 48 kHz context = 23.4 Hz per bin
    const BIN_HZ = 48000 / 2048

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (now - last < 1000 / 30) return
      last = now
      const c = ref.current
      if (!c) return
      const data = phenomena.getFrequencyData()

      if (emptyRef.current) emptyRef.current.style.opacity = data && phenomena.isPlaying ? '0' : '1'
      if (!data || !phenomena.isPlaying) return

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

      // the top half of the spectrum only: nearly all of the energy in these
      // models lives below ~6 kHz (bin 256 of 1024)
      const top = Math.floor(256)
      const bins = 60
      ctx.beginPath()
      for (let i = 0; i < bins; i++) {
        const a = Math.floor((i / bins) * top)
        const b = Math.max(a + 1, Math.floor(((i + 1) / bins) * top))
        let peak = 0
        for (let k = a; k < b; k++) peak = Math.max(peak, data[k])
        const v = peak / 255
        const x = (i / (bins - 1)) * w
        const y = h - Math.max(1.5, v ** 1.4 * h)
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

      // the frequency scale, in real hertz
      ctx.fillStyle = `${accent}80`
      ctx.font = '7px ui-monospace, monospace'
      const ticks = [250, 500, 1000, 2000, 4000, 6000]
      for (const hz of ticks) {
        const x = (Math.round(hz / BIN_HZ) / top) * w
        if (x < 8 || x > w - 4) continue
        ctx.fillRect(Math.round(x), 0, 1, 3)
        ctx.fillText(hz >= 1000 ? `${hz / 1000}k` : `${hz}`, Math.round(x) + 2, 8)
      }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [accent])

  return (
    <div className="relative h-full w-full">
      <canvas ref={ref} className="h-full w-full" aria-hidden="true" />
      <span
        ref={emptyRef}
        className="pointer-events-none absolute inset-0 flex items-center justify-center font-display text-[9px] font-bold uppercase tracking-[0.18em] text-[#ffe9b899] transition-opacity duration-300"
      >
        {label}
      </span>
    </div>
  )
}
