/**
 * Phenomenon playback engine.
 *
 * The backend measures a frame and returns a *spec*: a set of physically
 * motivated layers (filtered-noise beds, sine partials, stochastic bursts).
 * This engine synthesises those layers with WebAudio in real time — the exact
 * rules the offline NumPy renderer uses, so the WAV you download matches what
 * you hear.
 *
 * There is no note scheduling, no scale, no tempo grid. A wind bed is wind
 * because it is band-passed noise whose centre frequency follows measured
 * turbulence; a fire crackles because combustion pops are impulses.
 */

export interface SpecLayer {
  kind: 'noise' | 'tone' | 'burst'
  t0: number
  dur: number
  gain: number
  filter?: 'lowpass' | 'highpass' | 'bandpass'
  freq?: number
  q?: number
  pan?: number
  shape?: 'sine' | 'triangle' | 'sawtooth'
  attack?: number
  decay?: number
  burst?: 'thunder' | 'crackle' | 'click'
}

export interface SpecCell {
  row: number
  col: number
  cx: number
  cy: number
  brightness: number
  saturation: number
  hue: number
  turbulence: number
  edges: number
  gradient: number
  hot: number
  green: number
  water: number
  white: number
  dark: number
}

export interface Spec {
  model: 'wind' | 'storm' | 'fire' | 'ocean' | 'city' | 'canopy' | 'plume' | 'space'
  title: string
  duration: number
  layers: SpecLayer[]
  mapping: Record<string, string>
  explain: string
  grid: { cols: number; rows: number; cells: SpecCell[] }
  frame_stats: Record<string, number>
}

export interface PlaySnapshot {
  playing: boolean
  position: number
  duration: number
  level: number
}

export class PhenomenonPlayer {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private analyser: AnalyserNode | null = null
  private freqData: Uint8Array<ArrayBuffer> | null = null
  private timeData: Uint8Array<ArrayBuffer> | null = null
  private spec: Spec | null = null
  private startedAt = 0
  private playing = false
  private volume = 0.8
  private nodes: AudioScheduledSourceNode[] = []
  private raf = 0
  private noiseBuffer: AudioBuffer | null = null
  private snapshot: PlaySnapshot = { playing: false, position: 0, duration: 0, level: 0 }

  onSnapshot: ((s: PlaySnapshot) => void) | null = null
  onEnded: (() => void) | null = null
  /** Grid cell energies, for the visual layer. */
  onEnergy: ((values: Float32Array, cols: number, rows: number) => void) | null = null

  get isPlaying() {
    return this.playing
  }

  /** 0–1 through the current spec, for the cabinet's card. */
  get progress() {
    const d = this.spec?.duration ?? 0
    return d ? Math.min(1, this.snapshot.position / d) : 0
  }

  get context() {
    return this.ctx
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
    this.analyser.smoothingTimeConstant = 0.7
    this.master.connect(this.analyser)
    this.analyser.connect(ctx.destination)
    this.freqData = new Uint8Array(this.analyser.frequencyBinCount)
    this.timeData = new Uint8Array(this.analyser.fftSize)

    // one 2-second noise buffer reused by every noise layer
    const n = ctx.sampleRate * 2
    this.noiseBuffer = ctx.createBuffer(1, n, ctx.sampleRate)
    const data = this.noiseBuffer.getChannelData(0)
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1

    if (ctx.state === 'suspended') await ctx.resume()
  }

  setVolume(v: number) {
    this.volume = v
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.04)
  }

  load(spec: Spec) {
    this.stop()
    this.spec = spec
    this.snapshot = { playing: false, position: 0, duration: spec.duration, level: 0 }
    this.onSnapshot?.(this.snapshot)
  }

  get duration() {
    return this.spec?.duration ?? 0
  }

  async play(from = 0) {
    if (!this.ctx || !this.spec) return
    if (this.ctx.state === 'suspended') await this.ctx.resume()
    this.stopSources()
    this.playing = true
    this.startedAt = this.ctx.currentTime - from

    for (const layer of this.spec.layers) {
      if (layer.t0 + layer.dur <= from) continue
      this.schedule(layer, from)
    }
    this.loop()
  }

  private schedule(layer: SpecLayer, offset: number) {
    const ctx = this.ctx!
    const when = Math.max(this.startedAt + layer.t0, ctx.currentTime)
    const trim = Math.max(0, offset - layer.t0)
    const dur = layer.dur - trim
    if (dur <= 0.01 || layer.gain <= 0) return

    const pan = ctx.createStereoPanner()
    pan.pan.value = Math.max(-1, Math.min(1, layer.pan ?? 0))
    pan.connect(this.master!)

    if (layer.kind === 'noise') {
      const src = ctx.createBufferSource()
      src.buffer = this.noiseBuffer
      src.loop = true
      const filter = ctx.createBiquadFilter()
      filter.type = layer.filter === 'lowpass' ? 'lowpass' : layer.filter === 'highpass' ? 'highpass' : 'bandpass'
      filter.frequency.value = Math.max(30, layer.freq ?? 800)
      filter.Q.value = Math.max(0.2, layer.q ?? 1)
      const gain = ctx.createGain()
      // fade in/out so beds breathe rather than switch
      const fade = Math.min(0.25, dur / 3)
      gain.gain.setValueAtTime(0.0001, when)
      gain.gain.linearRampToValueAtTime(layer.gain * 1.6, when + fade)
      gain.gain.setValueAtTime(layer.gain * 1.6, when + Math.max(fade, dur - fade))
      gain.gain.linearRampToValueAtTime(0.0001, when + dur)
      src.connect(filter).connect(gain).connect(pan)
      src.start(when, Math.random() * 1.5)
      src.stop(when + dur)
      this.nodes.push(src)
      return
    }

    if (layer.kind === 'tone') {
      const osc = ctx.createOscillator()
      osc.type = layer.shape ?? 'sine'
      osc.frequency.value = Math.max(30, layer.freq ?? 440)
      const gain = ctx.createGain()
      const a = Math.max(0.002, layer.attack ?? 0.005)
      gain.gain.setValueAtTime(0.0001, when)
      gain.gain.linearRampToValueAtTime(layer.gain * 2.2, when + a)
      gain.gain.exponentialRampToValueAtTime(0.0001, when + dur)
      osc.connect(gain).connect(pan)
      osc.start(when)
      osc.stop(when + dur + 0.02)
      this.nodes.push(osc)
      return
    }

    // bursts
    if (layer.burst === 'thunder') {
      const src = ctx.createBufferSource()
      src.buffer = this.noiseBuffer
      src.loop = true
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = Math.max(40, layer.freq ?? 80)
      lp.Q.value = 0.9
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.0001, when)
      gain.gain.linearRampToValueAtTime(layer.gain * 4, when + 0.06)
      gain.gain.exponentialRampToValueAtTime(0.0001, when + dur)
      src.connect(lp).connect(gain).connect(pan)
      src.start(when, Math.random())
      src.stop(when + dur)
      this.nodes.push(src)
      return
    }

    if (layer.burst === 'crackle') {
      // short filtered noise impulse: a combustion pop
      const len = Math.max(1, Math.floor(dur * ctx.sampleRate))
      const buf = ctx.createBuffer(1, len, ctx.sampleRate)
      const d = buf.getChannelData(0)
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.18))
      const src = ctx.createBufferSource()
      src.buffer = buf
      const hp = ctx.createBiquadFilter()
      hp.type = 'highpass'
      hp.frequency.value = Math.max(200, layer.freq ?? 3000)
      const gain = ctx.createGain()
      gain.gain.value = layer.gain * 3.4
      src.connect(hp).connect(gain).connect(pan)
      src.start(when)
      this.nodes.push(src)
      return
    }

    // click / droplet
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = Math.max(200, layer.freq ?? 3000)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(layer.gain * 3, when)
    gain.gain.exponentialRampToValueAtTime(0.0001, when + Math.max(0.03, dur))
    osc.connect(gain).connect(pan)
    osc.start(when)
    osc.stop(when + dur + 0.02)
    this.nodes.push(osc)
  }

  private loop = () => {
    if (!this.playing || !this.ctx || !this.spec) return
    const pos = this.ctx.currentTime - this.startedAt
    const level = this.getLevel()

    // energy per grid cell: which measurements are currently sounding
    if (this.onEnergy) {
      const bands = this.getFrequencyData()
      const { cols, rows } = this.spec.grid
      const values = new Float32Array(cols * rows)
      for (const layer of this.spec.layers) {
        if (pos < layer.t0 || pos > layer.t0 + layer.dur) continue
        const pan = layer.pan ?? 0
        const col = Math.max(0, Math.min(cols - 1, Math.floor(((pan + 1) / 2) * cols)))
        const row = Math.max(0, Math.min(rows - 1, Math.floor((layer.t0 / this.spec.duration) * rows)))
        values[row * cols + col] += layer.gain * 2
      }
      if (bands) {
        let sum = 0
        for (let i = 0; i < bands.length; i++) sum += bands[i]
        const norm = sum / bands.length / 255
        for (let i = 0; i < values.length; i++) values[i] = Math.min(1, values[i] * 2 + norm * 0.4)
      }
      this.onEnergy(values, cols, rows)
    }

    this.snapshot = {
      playing: true,
      position: Math.min(pos, this.spec.duration),
      duration: this.spec.duration,
      level,
    }
    this.onSnapshot?.(this.snapshot)

    if (pos >= this.spec.duration) {
      this.stop()
      this.onEnded?.()
      return
    }
    this.raf = requestAnimationFrame(this.loop)
  }

  stop() {
    this.playing = false
    cancelAnimationFrame(this.raf)
    this.stopSources()
    this.snapshot = { ...this.snapshot, playing: false, level: 0 }
    this.onSnapshot?.(this.snapshot)
  }

  private stopSources() {
    for (const n of this.nodes) {
      try {
        n.stop()
      } catch {
        /* already stopped */
      }
    }
    this.nodes = []
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

  getSpec() {
    return this.spec
  }

  dispose() {
    this.stop()
    void this.ctx?.close()
    this.ctx = null
  }
}

export const phenomena = new PhenomenonPlayer()
