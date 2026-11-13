/**
 * Mechanical sounds for the cabinet.
 *
 * These are *not* sonification — they are the machine: the main switch
 * throwing, the carousel indexing, a disc settling into the cradle, the
 * needle dropping. They are deliberately quiet and mixed under the music.
 */

type Ctx = AudioContext

class Mechanism {
  private ctx: Ctx | null = null
  private out: GainNode | null = null
  private noise: AudioBuffer | null = null
  private muted = false

  private ensure(): Ctx | null {
    if (typeof window === 'undefined') return null
    if (this.ctx) return this.ctx
    const Ctor: typeof AudioContext =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    const ctx = new Ctor()
    this.ctx = ctx
    this.out = ctx.createGain()
    this.out.gain.value = 0.5
    this.out.connect(ctx.destination)
    const n = Math.floor(ctx.sampleRate * 1.5)
    this.noise = ctx.createBuffer(1, n, ctx.sampleRate)
    const d = this.noise.getChannelData(0)
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1
    return ctx
  }

  setMuted(v: boolean) {
    this.muted = v
  }

  /** Must be called from a user gesture the first time. */
  async unlock() {
    const ctx = this.ensure()
    if (ctx?.state === 'suspended') await ctx.resume()
  }

  private noiseHit(
    when: number,
    dur: number,
    type: BiquadFilterType,
    freq: number,
    q: number,
    gain: number,
    sweepTo?: number,
  ) {
    const ctx = this.ctx!
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    src.loop = true
    const f = ctx.createBiquadFilter()
    f.type = type
    f.frequency.setValueAtTime(freq, when)
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, when + dur)
    f.Q.value = q
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, when)
    g.gain.linearRampToValueAtTime(gain, when + Math.min(0.012, dur * 0.2))
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur)
    src.connect(f).connect(g).connect(this.out!)
    src.start(when, Math.random())
    src.stop(when + dur + 0.02)
  }

  private tone(
    when: number,
    dur: number,
    f0: number,
    f1: number,
    gain: number,
    type: OscillatorType = 'sine',
  ) {
    const ctx = this.ctx!
    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.setValueAtTime(f0, when)
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), when + dur)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, when)
    g.gain.linearRampToValueAtTime(gain, when + 0.006)
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur)
    osc.connect(g).connect(this.out!)
    osc.start(when)
    osc.stop(when + dur + 0.02)
  }

  private go(fn: (t: number) => void) {
    if (this.muted) return
    const ctx = this.ensure()
    if (!ctx) return
    if (ctx.state === 'suspended') void ctx.resume()
    fn(ctx.currentTime + 0.01)
  }

  /** Heavy brass throw of the main switch, then tubes warming up. */
  switchOn() {
    this.go((t) => {
      this.tone(t, 0.09, 180, 60, 0.5)
      this.noiseHit(t, 0.05, 'highpass', 2400, 0.7, 0.35)
      this.noiseHit(t + 0.05, 0.5, 'bandpass', 260, 1.1, 0.1, 700)
      this.tone(t + 0.16, 0.5, 70, 110, 0.16)
      this.tone(t + 0.34, 0.7, 220, 330, 0.06, 'triangle')
    })
  }

  switchOff() {
    this.go((t) => {
      this.tone(t, 0.12, 120, 40, 0.4)
      this.noiseHit(t, 0.09, 'lowpass', 900, 0.8, 0.28, 180)
      this.tone(t + 0.24, 0.8, 200, 60, 0.08, 'triangle')
    })
  }

  /** Carousel indexing to the next slot. */
  index(dir: 1 | -1 = 1) {
    this.go((t) => {
      this.noiseHit(t, 0.16, 'bandpass', dir > 0 ? 520 : 640, 1.4, 0.16, dir > 0 ? 900 : 300)
      this.noiseHit(t + 0.16, 0.12, 'lowpass', 520, 0.9, 0.22)
      this.tone(t + 0.19, 0.1, 160, 90, 0.16)
    })
  }

  /** The disc travels from the rack into the cradle. */
  transport() {
    this.go((t) => {
      this.noiseHit(t, 0.5, 'bandpass', 320, 2.2, 0.11, 1100)
      this.noiseHit(t + 0.44, 0.14, 'lowpass', 420, 1, 0.3)
      this.tone(t + 0.46, 0.12, 200, 120, 0.12)
    })
  }

  /** Needle touching the groove: hiss into the first layer. */
  needle() {
    this.go((t) => {
      this.noiseHit(t, 0.035, 'highpass', 3000, 0.6, 0.3)
      this.noiseHit(t + 0.03, 0.9, 'highpass', 1800, 0.5, 0.05)
      this.tone(t, 0.06, 300, 140, 0.1)
    })
  }

  /** Soft bell when the record finishes and the arm lifts. */
  lift() {
    this.go((t) => {
      this.tone(t, 0.9, 660, 662, 0.05, 'sine')
      this.tone(t + 0.02, 0.7, 990, 994, 0.03, 'sine')
      this.noiseHit(t, 0.25, 'lowpass', 700, 0.7, 0.06)
    })
  }
}

export const mechanism = new Mechanism()
