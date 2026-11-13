/**
 * Phenomenon playback engine — the browser half of the physical-model engine.
 *
 * The backend measures a frame and returns a *spec*: for each phenomenon, a set
 * of physical layers (turbulence, bodies, thunder, droplet and crackle impact
 * trains, swells, modal pings, glints, Caldwell scan tones). This class rebuilds
 * exactly those mechanisms with WebAudio, block for block, so what you hear in
 * the browser is what `render.py` writes to the downloadable WAV.
 *
 * Rules held throughout:
 *   · no note scheduling, no scale, no tempo grid, no reverb;
 *   · every impact keeps its own pan, so rain is wide and fire is a field;
 *   · the only "instrument" is a resonator, and the resonator's frequency and
 *     decay always come from a measurement.
 */

export type LayerKind = 'noise' | 'res' | 'hit' | 'swell' | 'tone'
export type LayerModel =
  | 'turbulence' | 'body' | 'thunder' | 'droplet' | 'crackle' | 'glint' | 'ping'
  | 'swell' | 'foam' | 'whistle' | 'plume' | 'sparkle' | 'scan'

export interface AudibleEvent {
  t: number
  f: number
  g: number
  p: number
  d: number
}

export interface SpecLayer {
  kind: LayerKind
  model: LayerModel
  t0: number
  dur: number
  gain: number
  freq?: number
  q?: number
  pan?: number
  gust?: number
  decay?: number
  crack?: number
  period?: number
  attack?: number
  drops?: AudibleEvent[]
  hits?: AudibleEvent[]
  glints?: AudibleEvent[]
  pings?: AudibleEvent[]
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
  rel?: number
}

export interface Spec {
  model: 'wind' | 'storm' | 'fire' | 'ocean' | 'city' | 'canopy' | 'plume' | 'space'
  title: string
  duration: number
  layers: SpecLayer[]
  mapping: string
  explain: string
  grid: { cols: number; rows: number; cells: SpecCell[] }
  frame_stats: Record<string, number>
  drop_count?: number
  crackle_count?: number
}

export interface PlaySnapshot {
  playing: boolean
  position: number
  duration: number
  level: number
}

const MAX_RESONATORS = 1400

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
  onEnergy: ((values: Float32Array, cols: number, rows: number) => void) | null = null

  get isPlaying() {
    return this.playing
  }

  get progress() {
    const d = this.spec?.duration ?? 0
    return d ? Math.min(1, this.snapshot.position / d) : 0
  }

  get context() {
    return this.ctx
  }

  getSpec() {
    return this.spec
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

    const n = Math.floor(ctx.sampleRate * 2)
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
    // a session can only afford so many live oscillators: schedule the
    // impacts that are about to happen and top up as the transport runs
    this.scheduleFrom(from)
    this.loop()
  }

  /** Schedule every layer that starts within the next `horizon` seconds. */
  private scheduleFrom(from: number, horizon = 6) {
    if (!this.spec) return
    const upto = from + horizon
    for (const layer of this.spec.layers) {
      if (layer.t0 + layer.dur <= from) continue
      if (layer.t0 > upto) continue
      this.schedule(layer, from)
    }
  }

  private panner(value: number) {
    const pan = this.ctx!.createStereoPanner()
    pan.pan.value = Math.max(-1, Math.min(1, value))
    pan.connect(this.master!)
    return pan
  }

  private noiseSource() {
    const src = this.ctx!.createBufferSource()
    src.buffer = this.noiseBuffer
    src.loop = true
    return src
  }

  private biquad(type: BiquadFilterType, freq: number, q = 1) {
    const f = this.ctx!.createBiquadFilter()
    f.type = type
    f.frequency.value = Math.max(20, Math.min(this.ctx!.sampleRate * 0.45, freq))
    f.Q.value = Math.max(0.1, q)
    return f
  }

  private schedule(layer: SpecLayer, offset: number) {
    const ctx = this.ctx!
    const when = Math.max(this.startedAt + layer.t0, ctx.currentTime + 0.01)
    const trim = Math.max(0, offset - layer.t0)
    const dur = layer.dur - trim
    if (dur <= 0.008 || layer.gain <= 0) return
    const pan = this.panner(layer.pan ?? 0)

    switch (layer.model) {
      /* ---------------- turbulence: the wind ---------------- */
      case 'turbulence': {
        const src = this.noiseSource()
        const bp1 = this.biquad('bandpass', layer.freq ?? 800, layer.q ?? 1)
        const bp2 = this.biquad('bandpass', layer.freq ?? 800, layer.q ?? 1)
        const gain = ctx.createGain()
        // the gust: two slow LFO-ish ramps give the swell and fall of pressure
        const g = layer.gain * 2.6
        const gust = layer.gust ?? 1
        gain.gain.setValueAtTime(0.0001, when)
        const steps = 7
        for (let i = 1; i <= steps; i++) {
          const f = i / steps
          const bump = 0.45 + 0.55 * Math.abs(Math.sin(f * Math.PI * (1 + 0.6 * gust) + layer.t0))
          gain.gain.linearRampToValueAtTime(g * bump, when + dur * f)
        }
        gain.gain.linearRampToValueAtTime(0.0001, when + dur)
        src.connect(bp1).connect(bp2).connect(gain).connect(pan)
        src.start(when, Math.random() * 1.5)
        src.stop(when + dur)
        this.nodes.push(src)
        return
      }

      /* ---------------- body / roar / sub: the mass ---------------- */
      case 'body':
      case 'plume': {
        const src = this.noiseSource()
        const lp = this.biquad('lowpass', layer.freq ?? 120, 0.7)
        const gain = ctx.createGain()
        const fade = Math.min(0.4, dur / 3)
        gain.gain.setValueAtTime(0.0001, when)
        gain.gain.linearRampToValueAtTime(layer.gain * 2.2, when + fade)
        gain.gain.setValueAtTime(layer.gain * 2.2, when + Math.max(fade, dur - fade))
        gain.gain.linearRampToValueAtTime(0.0001, when + dur)
        src.connect(lp).connect(gain).connect(pan)
        src.start(when, Math.random() * 1.5)
        src.stop(when + dur)
        this.nodes.push(src)
        return
      }

      /* ---------------- thunder: crack then rumble ---------------- */
      case 'thunder': {
        const src = this.noiseSource()
        const lp = this.biquad('lowpass', layer.freq ?? 80, 0.9)
        const crack = this.noiseSource()
        const hp = this.biquad('highpass', 700, 0.7)
        const crackGain = ctx.createGain()
        const bodyGain = ctx.createGain()
        crackGain.gain.setValueAtTime(layer.gain * 1.5 * (layer.crack ?? 0.5), when)
        crackGain.gain.exponentialRampToValueAtTime(0.0001, when + 0.09)
        bodyGain.gain.setValueAtTime(0.0001, when)
        bodyGain.gain.linearRampToValueAtTime(layer.gain * 3.2, when + 0.05)
        bodyGain.gain.exponentialRampToValueAtTime(0.0001, when + dur)
        crack.connect(hp).connect(crackGain).connect(pan)
        src.connect(lp).connect(bodyGain).connect(pan)
        crack.start(when, Math.random())
        crack.stop(when + 0.12)
        src.start(when, Math.random())
        src.stop(when + dur)
        this.nodes.push(crack, src)
        return
      }

      /* ---------------- impacts: drops, crackles, glints, pings -------- */
      case 'droplet':
      case 'crackle':
      case 'glint':
      case 'ping': {
        const events: AudibleEvent[] =
          layer.model === 'droplet'
            ? layer.drops ?? []
            : layer.model === 'crackle'
              ? layer.hits ?? []
              : layer.model === 'glint'
                ? layer.glints ?? []
                : layer.pings ?? []
        const budget = Math.floor(MAX_RESONATORS / 12)
        for (const e of events.slice(0, budget)) {
          const at = this.startedAt + e.t
          if (at < ctx.currentTime) continue
          this.impact(at, e, layer.model)
        }
        return
      }

      /* ---------------- swells / foam ---------------- */
      case 'swell': {
        const src = this.noiseSource()
        const bp = this.biquad('bandpass', layer.freq ?? 700, 1.1)
        const gain = ctx.createGain()
        const period = Math.max(0.6, layer.period ?? 5)
        const g = layer.gain * 2.1
        gain.gain.setValueAtTime(0.0001, when)
        const cycles = Math.max(1, Math.round(dur / (period / 2)))
        for (let i = 1; i <= cycles; i++) {
          const f = i / cycles
          gain.gain.linearRampToValueAtTime(g * ((i % 2) * 0.85 + 0.15), when + dur * f)
        }
        gain.gain.linearRampToValueAtTime(0.0001, when + dur)
        src.connect(bp).connect(gain).connect(pan)
        src.start(when, Math.random() * 1.5)
        src.stop(when + dur)
        this.nodes.push(src)
        return
      }

      case 'foam': {
        const src = this.noiseSource()
        const hp = this.biquad('highpass', layer.freq ?? 3000, 0.7)
        const gain = ctx.createGain()
        gain.gain.setValueAtTime(layer.gain * 1.7, when)
        gain.gain.exponentialRampToValueAtTime(0.0001, when + dur)
        src.connect(hp).connect(gain).connect(pan)
        src.start(when, Math.random())
        src.stop(when + dur)
        this.nodes.push(src)
        return
      }

      /* ---------------- a thin resonance riding the gust ---------------- */
      case 'whistle': {
        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.value = layer.freq ?? 900
        const gain = ctx.createGain()
        gain.gain.setValueAtTime(0.0001, when)
        gain.gain.linearRampToValueAtTime(layer.gain * 0.9, when + dur * 0.4)
        gain.gain.linearRampToValueAtTime(0.0001, when + dur)
        osc.connect(gain).connect(pan)
        osc.start(when)
        osc.stop(when + dur + 0.02)
        this.nodes.push(osc)
        return
      }

      /* ---------------- sparkle: brief bright glints ---------------- */
      case 'sparkle': {
        for (const e of layer.glints ?? []) {
          const at = this.startedAt + e.t
          if (at < ctx.currentTime) continue
          this.impact(at, e, 'glint')
        }
        return
      }

      /* ---------------- Caldwell: pure scan tones ---------------- */
      case 'scan': {
        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.value = layer.freq ?? 220
        const gain = ctx.createGain()
        const a = Math.max(0.004, layer.attack ?? 0.015)
        const g = layer.gain * 2.0
        gain.gain.setValueAtTime(0.0001, when)
        gain.gain.linearRampToValueAtTime(g, when + a)
        gain.gain.setValueAtTime(g, when + Math.max(a, dur * 0.75))
        gain.gain.linearRampToValueAtTime(0.0001, when + dur)
        osc.connect(gain).connect(pan)
        osc.start(when)
        osc.stop(when + dur + 0.02)
        this.nodes.push(osc)
        return
      }
    }
  }

  /**
   * One resonant impact. A drop on a leaf, a crackle of sap, a light glint and
   * a struck piece of canopy are all difference in *decay and partials*, which
   * is exactly how they differ in the world.
   */
  private impact(at: number, e: AudibleEvent, kind: 'droplet' | 'crackle' | 'glint' | 'ping') {
    const ctx = this.ctx!
    const partials = kind === 'crackle' ? [1, 2.4, 4.1] : kind === 'ping' ? [1, 1.62, 2.4] : kind === 'glint' ? [1, 1.004] : [1, 1.62]
    const amp = kind === 'crackle' ? [1, 0.5, 0.25] : kind === 'ping' ? [1, 0.45, 0.22] : kind === 'glint' ? [1, 0.12] : [1, 0.35]
    const decay = Math.max(0.004, e.d)
    const pan = this.panner(e.p)
    const gain = ctx.createGain()
    const g = e.g * (kind === 'glint' ? 0.5 : 0.8)
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.linearRampToValueAtTime(g, at + 0.002)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + decay * 6)
    gain.connect(pan)
    partials.forEach((mult, i) => {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = Math.min(ctx.sampleRate * 0.45, e.f * mult)
      const pg = ctx.createGain()
      pg.gain.value = amp[i]
      osc.connect(pg).connect(gain)
      osc.start(at)
      osc.stop(at + decay * 6 + 0.02)
      this.nodes.push(osc)
    })
  }

  private loop = () => {
    if (!this.playing || !this.ctx || !this.spec) return
    const pos = this.ctx.currentTime - this.startedAt
    const level = this.getLevel()
    // top up the schedule as the transport advances (rolling 6 s horizon)
    this.scheduleFrom(pos, 2)

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

  dispose() {
    this.stop()
    void this.ctx?.close()
    this.ctx = null
  }
}

export const phenomena = new PhenomenonPlayer()
