/**
 * Pixel scanner player — plays the backend's measured scan verbatim.
 *
 * There is no scheduling of musical choices here. The server measured the
 * image row by row and emitted tones (pitch, loudness, pan, noise, melody).
 * This engine starts a WebAudio oscillator for each tone at the time the
 * server computed, and mixes each band's noise layer through a filter whose
 * cutoff is that band's measured texture.
 *
 * Pitch, timing and dynamics are properties of the image, not of a synth
 * patch. The only listener-facing control is master volume.
 */

export interface ScanTone {
  time: number
  duration: number
  freq: number
  amp: number
  pan: number
  noise: number
  melody: { freq: number; amp: number }[]
  melody_step: number
  band: number
  label: string
}

export interface ScanSeriesStep {
  index: number
  label: string
  time: number
  duration: number
  freq: number
  amp: number
  hue: number
  relative_brightness?: number
}

export interface ScanPayload {
  duration: number
  tones: ScanTone[]
  bands: {
    band: number
    label: string
    luminance: number
    saturation: number
    hue: number
    edge: number
    texture: number
    samples: number[]
  }[]
  normalization: {
    luminance_p2: number
    luminance_p98: number
    gain: number
    method: string
  }
  summary: {
    mean_luminance: number
    mean_hue: number
    mean_pitch_hz: number
    mean_edge: number
  }
  mapping: Record<string, string>
}

export interface SeriesPayload {
  duration: number
  steps: ScanSeriesStep[]
}

export interface ScanSnapshot {
  playing: boolean
  position: number
  duration: number
  band: number
  bandLabel: string
  freq: number
  amp: number
  seriesLabel: string | null
  seriesProgress: number
}

export class ScanPlayer {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private analyser: AnalyserNode | null = null
  private freqData: Uint8Array<ArrayBuffer> | null = null
  private timeData: Uint8Array<ArrayBuffer> | null = null

  private payload: ScanPayload | null = null
  private series: SeriesPayload | null = null
  private startedAt = 0
  private playing = false
  private volume = 0.75
  private sources: AudioScheduledSourceNode[] = []

  private snapshot: ScanSnapshot = {
    playing: false,
    position: 0,
    duration: 0,
    band: -1,
    bandLabel: '',
    freq: 0,
    amp: 0,
    seriesLabel: null,
    seriesProgress: 0,
  }
  onSnapshot: ((s: ScanSnapshot) => void) | null = null
  onEnded: (() => void) | null = null
  private raf = 0

  get isPlaying() {
    return this.playing
  }

  async init(): Promise<void> {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') await this.ctx.resume()
      return
    }
    const Ctor: typeof AudioContext =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctor()
    this.ctx = ctx
    this.master = ctx.createGain()
    this.master.gain.value = this.volume
    this.analyser = ctx.createAnalyser()
    this.analyser.fftSize = 2048
    this.analyser.smoothingTimeConstant = 0.72
    this.master.connect(this.analyser)
    this.analyser.connect(ctx.destination)
    this.freqData = new Uint8Array(this.analyser.frequencyBinCount)
    this.timeData = new Uint8Array(this.analyser.fftSize)
    if (ctx.state === 'suspended') await ctx.resume()
  }

  setVolume(v: number) {
    this.volume = v
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.04)
  }

  load(payload: ScanPayload, series: SeriesPayload | null) {
    this.stop()
    this.payload = payload
    this.series = series
    this.snapshot = {
      playing: false,
      position: 0,
      duration: payload.duration,
      band: -1,
      bandLabel: '',
      freq: 0,
      amp: 0,
      seriesLabel: null,
      seriesProgress: 0,
    }
    this.emit()
  }

  get duration() {
    return this.payload?.duration ?? 0
  }

  async play(fromPosition = 0) {
    if (!this.ctx || !this.payload) return
    if (this.ctx.state === 'suspended') await this.ctx.resume()
    this.stopSources()
    this.playing = true
    this.startedAt = this.ctx.currentTime - fromPosition
    const offset = fromPosition

    for (const tone of this.payload.tones) {
      if (tone.time + tone.duration <= offset) continue
      this.startTone(tone, this.startedAt + tone.time, offset)
    }
    if (this.series) {
      for (const step of this.series.steps) {
        if (step.time + step.duration <= offset) continue
        this.startSeriesStep(step, offset)
      }
    }

    this.snapshot = { ...this.snapshot, playing: true }
    this.loop()
  }

  private startTone(tone: ScanTone, startAt: number, offset: number) {
    const ctx = this.ctx!
    const when = Math.max(startAt, ctx.currentTime)
    const trim = Math.max(0, offset - tone.time)
    const dur = tone.duration - trim
    if (dur <= 0.01) return

    const panner = ctx.createStereoPanner()
    panner.pan.value = Math.max(-1, Math.min(1, tone.pan))
    panner.connect(this.master!)

    const gain = ctx.createGain()
    const env = Math.min(0.02, dur / 4)
    gain.gain.setValueAtTime(0.0001, when)
    gain.gain.linearRampToValueAtTime(tone.amp, when + env)
    gain.gain.setValueAtTime(tone.amp, when + Math.max(env, dur - env))
    gain.gain.linearRampToValueAtTime(0.0001, when + dur)
    gain.connect(panner)

    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = tone.freq
    osc.connect(gain)
    osc.start(when)
    osc.stop(when + dur)
    this.sources.push(osc)

    if (tone.noise > 0.01) {
      const n = Math.max(1, Math.floor(dur * ctx.sampleRate))
      const buf = ctx.createBuffer(1, n, ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1
      const src = ctx.createBufferSource()
      src.buffer = buf
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 800 + tone.noise * 6000
      const ng = ctx.createGain()
      ng.gain.value = tone.noise * tone.amp * 0.8
      src.connect(lp).connect(ng).connect(panner)
      src.start(when)
      src.stop(when + dur)
      this.sources.push(src)
    }

    tone.melody.forEach((note, k) => {
      const t0 = startAt + k * tone.melody_step
      if (t0 + 0.3 < ctx.currentTime) return
      const s = Math.max(t0, ctx.currentTime)
      const len = 0.3
      const mg = ctx.createGain()
      mg.gain.setValueAtTime(0.0001, s)
      mg.gain.linearRampToValueAtTime(note.amp, s + 0.008)
      mg.gain.exponentialRampToValueAtTime(0.0001, s + len)
      mg.connect(this.master!)
      const mo = ctx.createOscillator()
      mo.type = 'sine'
      mo.frequency.value = note.freq
      mo.connect(mg)
      mo.start(s)
      mo.stop(s + len)
      this.sources.push(mo)
    })
  }

  private startSeriesStep(step: ScanSeriesStep, offset: number) {
    const ctx = this.ctx!
    const when = Math.max(this.startedAt + step.time, ctx.currentTime)
    const trim = Math.max(0, offset - step.time)
    const dur = step.duration - trim
    if (dur <= 0.01) return
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = step.freq
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, when)
    g.gain.linearRampToValueAtTime(step.amp * 0.6, when + 0.25)
    g.gain.setValueAtTime(step.amp * 0.6, when + Math.max(0.25, dur - 0.25))
    g.gain.linearRampToValueAtTime(0.0001, when + dur)
    const p = ctx.createStereoPanner()
    p.pan.value = Math.cos((step.hue * Math.PI) / 180) * 0.8
    osc.connect(g).connect(p).connect(this.master!)
    osc.start(when)
    osc.stop(when + dur)
    this.sources.push(osc)
  }

  private loop = () => {
    if (!this.playing || !this.ctx || !this.payload) return
    const pos = this.ctx.currentTime - this.startedAt
    const total = this.payload.duration
    const tones = this.payload.tones
    let idx = -1
    for (let i = 0; i < tones.length; i++) {
      if (pos >= tones[i].time && pos < tones[i].time + tones[i].duration) {
        idx = i
        break
      }
    }
    const current = idx >= 0 ? tones[idx] : null

    let seriesLabel: string | null = null
    let seriesProgress = 0
    if (this.series) {
      for (const step of this.series.steps) {
        if (pos >= step.time && pos < step.time + step.duration) {
          seriesLabel = step.label
          seriesProgress = (pos - step.time) / step.duration
          break
        }
      }
    }

    this.snapshot = {
      playing: true,
      position: Math.min(pos, total),
      duration: total,
      band: current ? current.band : -1,
      bandLabel: current ? current.label : '',
      freq: current ? current.freq : 0,
      amp: current ? current.amp : 0,
      seriesLabel,
      seriesProgress,
    }
    this.emit()

    if (pos >= total) {
      this.stop()
      this.onEnded?.()
      return
    }
    this.raf = requestAnimationFrame(this.loop)
  }

  private emit() {
    this.onSnapshot?.({ ...this.snapshot })
  }

  stop() {
    this.playing = false
    cancelAnimationFrame(this.raf)
    this.stopSources()
    this.snapshot = { ...this.snapshot, playing: false, band: -1, seriesLabel: null }
    this.emit()
  }

  private stopSources() {
    for (const s of this.sources) {
      try {
        s.stop()
      } catch {
        /* already stopped */
      }
    }
    this.sources = []
  }

  getSnapshot(): ScanSnapshot {
    return { ...this.snapshot }
  }

  getFrequencyData(): Uint8Array | null {
    if (!this.analyser || !this.freqData) return null
    this.analyser.getByteFrequencyData(this.freqData)
    return this.freqData
  }

  getTimeDomainData(): Uint8Array | null {
    if (!this.analyser || !this.timeData) return null
    this.analyser.getByteTimeDomainData(this.timeData)
    return this.timeData
  }

  getLevel(): number {
    const data = this.getTimeDomainData()
    if (!data) return 0
    let sum = 0
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128
      sum += v * v
    }
    return Math.sqrt(sum / data.length)
  }

  dispose() {
    this.stop()
    void this.ctx?.close()
    this.ctx = null
  }
}

export const player = new ScanPlayer()
