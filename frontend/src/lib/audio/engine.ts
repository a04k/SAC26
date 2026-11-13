/**
 * Terra Jukebox — realtime sonification engine (WebAudio).
 *
 * The backend's OpenCV pipeline turns an EIC frame into `SonParams`
 * (root note, scale, tempo, density, brightness…). This engine performs those
 * parameters continuously: a lookahead scheduler quantizes every event to the
 * chosen scale, and per-dataset "instruments" voice them differently.
 *
 * Graph:
 *   voices -> bus -> [dry ----------------------\
 *                     \-> convolver(wet) -------+-> compressor -> analyser -> out
 */

import { NOTE_TO_PC, midiToFreq, scaleMidi, SCALES } from './scales'
import type { NoteEvent, SonParams } from '../types'

export interface LiveControls {
  volume: number
  tempoScale: number
  densityScale: number
  brightnessScale: number
  reverb: number
}

const LOOKAHEAD = 0.18 // seconds of audio scheduled ahead
const TICK_MS = 35

/** Small deterministic PRNG so each track has a recognisable, repeatable pattern. */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export class SonificationEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private bus: GainNode | null = null
  private wet: GainNode | null = null
  private analyser: AnalyserNode | null = null
  private freqData: Uint8Array<ArrayBuffer> | null = null
  private timeData: Uint8Array<ArrayBuffer> | null = null

  private params: SonParams | null = null
  private datasetId = 'night-lights'
  private live: LiveControls = {
    volume: 0.72,
    tempoScale: 1,
    densityScale: 1,
    brightnessScale: 1,
    reverb: 0.38,
  }

  private timer: number | null = null
  private playing = false
  private nextStepTime = 0
  private step = 0
  private rng = mulberry32(1)
  private arpDegree = 0
  private notes: NoteEvent[] = []
  private lastNow = 0

  sampleRate = 0

  get isPlaying() {
    return this.playing
  }

  get context() {
    return this.ctx
  }

  /** Must be called from a user gesture. */
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
    this.sampleRate = ctx.sampleRate

    const master = ctx.createGain()
    master.gain.value = this.live.volume

    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -14
    comp.knee.value = 22
    comp.ratio.value = 3.2
    comp.attack.value = 0.004
    comp.release.value = 0.22

    const analyser = ctx.createAnalyser()
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0.78

    const bus = ctx.createGain()
    bus.gain.value = 0.85

    const dry = ctx.createGain()
    dry.gain.value = 0.78

    const wet = ctx.createGain()
    wet.gain.value = this.live.reverb

    const convolver = ctx.createConvolver()
    convolver.buffer = this.makeImpulse(2.6, 2.4)

    bus.connect(dry)
    dry.connect(comp)
    bus.connect(convolver)
    convolver.connect(wet)
    wet.connect(comp)
    comp.connect(analyser)
    analyser.connect(master)
    master.connect(ctx.destination)

    this.master = master
    this.bus = bus
    this.wet = wet
    this.analyser = analyser
    this.freqData = new Uint8Array(analyser.frequencyBinCount)
    this.timeData = new Uint8Array(analyser.fftSize)

    if (ctx.state === 'suspended') await ctx.resume()
  }

  private makeImpulse(seconds: number, decay: number): AudioBuffer {
    const ctx = this.ctx!
    const len = Math.floor(ctx.sampleRate * seconds)
    const buf = ctx.createBuffer(2, len, ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch)
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** decay
      }
    }
    return buf
  }

  setParams(params: SonParams, datasetId: string) {
    const changedDataset = datasetId !== this.datasetId
    this.params = params
    this.datasetId = datasetId
    if (changedDataset) {
      this.rng = mulberry32(hashString(datasetId))
      this.arpDegree = 0
      this.step = 0
      this.notes = []
    }
  }

  setLive(partial: Partial<LiveControls>) {
    this.live = { ...this.live, ...partial }
    if (!this.ctx) return
    const t = this.ctx.currentTime
    if (this.master) this.master.gain.setTargetAtTime(this.live.volume, t, 0.05)
    if (this.wet) this.wet.gain.setTargetAtTime(this.live.reverb, t, 0.08)
  }

  start() {
    if (!this.ctx || !this.params) return
    if (this.playing) return
    this.playing = true
    this.nextStepTime = this.ctx.currentTime + 0.08
    this.lastNow = this.ctx.currentTime
    this.timer = window.setInterval(() => this.tick(), TICK_MS)
  }

  stop() {
    this.playing = false
    if (this.timer !== null) {
      window.clearInterval(this.timer)
      this.timer = null
    }
  }

  private tick() {
    const ctx = this.ctx
    if (!ctx || !this.params || !this.playing) return
    const tempo = this.params.tempo * this.live.tempoScale
    const stepDur = 60 / Math.max(40, tempo) / 2 // eighth notes

    while (this.nextStepTime < ctx.currentTime + LOOKAHEAD) {
      this.scheduleStep(this.step, this.nextStepTime, stepDur)
      this.nextStepTime += stepDur
      this.step = (this.step + 1) % 64
    }
    this.pruneNotes(ctx.currentTime)
  }

  // ---------------------------------------------------------------- voices

  private envGain(t: number, attack: number, decay: number, peak: number, hold = 0) {
    const g = this.ctx!.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(peak, t + attack)
    if (hold > 0) g.gain.setValueAtTime(peak, t + attack + hold)
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + decay)
    return { gain: g, end: t + attack + hold + decay }
  }

  private panner(pan: number) {
    const p = this.ctx!.createStereoPanner()
    p.pan.value = Math.max(-1, Math.min(1, pan))
    return p
  }

  private voicePad(t: number, midi: number, dur: number, velocity: number) {
    const ctx = this.ctx!
    const bright = 0.35 + this.paramsBrightness() * 0.65
    const { gain, end } = this.envGain(t, 0.35, 0.9, 0.13 * velocity, dur * 0.5)
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(320 + bright * 2600, t)
    filter.Q.value = 0.9
    const pan = this.panner(0)
    for (const [detune, level] of [[-6, 0.6], [6, 0.6], [0, 0.45]] as const) {
      const osc = ctx.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.value = midiToFreq(midi)
      osc.detune.value = detune
      const g = ctx.createGain()
      g.gain.value = level * 0.3
      osc.connect(g).connect(filter)
      osc.start(t)
      osc.stop(end)
    }
    filter.connect(gain).connect(pan).connect(this.bus!)
  }

  private voicePluck(t: number, midi: number, velocity: number, pan: number, decay = 0.55) {
    const ctx = this.ctx!
    const bright = 0.4 + this.paramsBrightness() * 0.6
    const { gain, end } = this.envGain(t, 0.006, decay, 0.22 * velocity)
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(900 + bright * 5200, t)
    filter.frequency.exponentialRampToValueAtTime(700, t + decay)
    const p = this.panner(pan)

    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = midiToFreq(midi)

    const osc2 = ctx.createOscillator()
    osc2.type = 'sine'
    osc2.frequency.value = midiToFreq(midi + 12)
    const g2 = ctx.createGain()
    g2.gain.value = 0.22 * bright

    osc.connect(filter)
    osc2.connect(g2).connect(filter)
    filter.connect(gain).connect(p).connect(this.bus!)
    osc.start(t)
    osc2.start(t)
    osc.stop(end)
    osc2.stop(end)
  }

  private voiceMarimba(t: number, midi: number, velocity: number, pan: number) {
    const ctx = this.ctx!
    const { gain, end } = this.envGain(t, 0.002, 0.9, 0.2 * velocity)
    const p = this.panner(pan)
    const f = midiToFreq(midi)
    const partials: [number, number][] = [
      [1, 1],
      [4, 0.28],
      [9.2, 0.09],
    ]
    for (const [mult, level] of partials) {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = f * mult
      const g = ctx.createGain()
      g.gain.value = level
      osc.connect(g).connect(gain)
      osc.start(t)
      osc.stop(end)
    }
    gain.connect(p).connect(this.bus!)
  }

  private voiceSineArp(t: number, midi: number, velocity: number, pan: number, dur: number) {
    const ctx = this.ctx!
    const { gain, end } = this.envGain(t, 0.01, dur, 0.17 * velocity, dur * 0.2)
    const p = this.panner(pan)
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = midiToFreq(midi)
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 4.6
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 3.5
    lfo.connect(lfoGain).connect(osc.detune)
    const shimmer = ctx.createOscillator()
    shimmer.type = 'sine'
    shimmer.frequency.value = midiToFreq(midi + 12)
    const sg = ctx.createGain()
    sg.gain.value = 0.18
    shimmer.connect(sg).connect(gain)
    osc.connect(gain).connect(p).connect(this.bus!)
    osc.start(t)
    lfo.start(t)
    shimmer.start(t)
    osc.stop(end)
    lfo.stop(end)
    shimmer.stop(end)
  }

  private voiceNoise(t: number, velocity: number, pan: number, dur: number) {
    const ctx = this.ctx!
    const src = ctx.createBufferSource()
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur))
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    src.buffer = buf
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 400 + this.paramsBrightness() * 5200
    filter.Q.value = 1.1
    const { gain, end } = this.envGain(t, 0.02, dur, 0.16 * velocity)
    const p = this.panner(pan)
    src.connect(filter).connect(gain).connect(p).connect(this.bus!)
    src.start(t)
    src.stop(end)
  }

  private voiceDrone(t: number, midi: number, dur: number, velocity: number) {
    const ctx = this.ctx!
    const { gain, end } = this.envGain(t, 1.1, 1.6, 0.14 * velocity, dur)
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 220 + this.paramsBrightness() * 900
    const p = this.panner(0)
    for (const detune of [-9, 9]) {
      const osc = ctx.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.value = midiToFreq(midi - 12)
      osc.detune.value = detune
      const g = ctx.createGain()
      g.gain.value = 0.4
      osc.connect(g).connect(filter)
      osc.start(t)
      osc.stop(end)
    }
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.12
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 140
    lfo.connect(lfoGain).connect(filter.frequency)
    lfo.start(t)
    lfo.stop(end)
    filter.connect(gain).connect(p).connect(this.bus!)
  }

  private voicePerc(t: number, velocity: number, pan: number) {
    const ctx = this.ctx!
    const src = ctx.createBufferSource()
    const len = Math.floor(ctx.sampleRate * 0.14)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3
    src.buffer = buf
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 1800 + this.paramsBrightness() * 4200
    const { gain, end } = this.envGain(t, 0.001, 0.16, 0.2 * velocity)
    const p = this.panner(pan)
    src.connect(hp).connect(gain).connect(p).connect(this.bus!)
    src.start(t)
    src.stop(end)

    // body thump
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(140, t)
    osc.frequency.exponentialRampToValueAtTime(48, t + 0.12)
    const og = ctx.createGain()
    og.gain.setValueAtTime(0.16 * velocity, t)
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.16)
    osc.connect(og).connect(p)
    osc.start(t)
    osc.stop(t + 0.18)
  }

  private voiceShimmer(t: number, midi: number, velocity: number, pan: number) {
    const ctx = this.ctx!
    const { gain, end } = this.envGain(t, 0.12, 1.6, 0.1 * velocity)
    const p = this.panner(pan)
    for (const [mult, level] of [[1, 1], [2, 0.4], [3, 0.16]] as const) {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = midiToFreq(midi) * mult
      const g = ctx.createGain()
      g.gain.value = level
      osc.connect(g).connect(gain)
      osc.start(t)
      osc.stop(end)
    }
    gain.connect(p).connect(this.bus!)
  }

  private voiceDeepSpace(t: number, midi: number, velocity: number, pan: number) {
    const ctx = this.ctx!
    const { gain, end } = this.envGain(t, 0.25, 2.4, 0.13 * velocity)
    const p = this.panner(pan)
    const car = ctx.createOscillator()
    car.type = 'sine'
    car.frequency.value = midiToFreq(midi)
    const mod = ctx.createOscillator()
    mod.frequency.value = midiToFreq(midi) * 1.5
    const modGain = ctx.createGain()
    modGain.gain.value = 60
    mod.connect(modGain).connect(car.frequency)
    car.connect(gain)
    mod.start(t)
    car.start(t)
    car.stop(end)
    mod.stop(end)
    gain.connect(p).connect(this.bus!)
  }

  // ------------------------------------------------------------- scheduling

  private paramsBrightness() {
    return Math.min(1, Math.max(0, (this.params?.brightness ?? 0.5) * this.live.brightnessScale))
  }

  private scheduleStep(step: number, t: number, stepDur: number) {
    const p = this.params
    if (!p) return
    const rnd = this.rng
    const rootPc = this.rootPc()
    const scale = this.scaleKey()
    const density = Math.min(1, p.density * this.live.densityScale)
    const bar = Math.floor(step / 8)
    const chordDeg = p.chord_degrees?.[bar % (p.chord_degrees.length || 1)] ?? 0
    const inst = p.instrument
    const energy = Math.min(1, p.energy * (0.7 + this.paramsBrightness() * 0.5))

    const panFromGrid = (): number => {
      const g = p.centroid
      const base = (g[0] - 0.5) * 1.4 * p.pan_spread
      return Math.max(-0.9, Math.min(0.9, base + (rnd() - 0.5) * 0.5 * p.pan_spread))
    }

    if (step % 8 === 0) {
      // chord / pad bed, once per bar
      const degs = inst === 'percussive' ? [0] : [0, 2, 4]
      degs.forEach((d, i) => {
        const midi = scaleMidi(rootPc, scale, chordDeg + d, inst === 'drone' ? 0 : 0)
        const v = 0.55 + energy * 0.45
        if (inst === 'drone') this.voiceDrone(t, midi, stepDur * 8, v)
        else if (inst === 'noise-texture') this.voiceNoise(t + i * 0.02, v, 0, stepDur * 3)
        else this.voicePad(t + i * 0.015, midi, stepDur * 8, v)
      })
      // bass
      const bassMidi = scaleMidi(rootPc, scale, chordDeg, -1)
      if (inst !== 'percussive' || rnd() < 0.7) {
        this.voicePluck(t, bassMidi, 0.9, 0, 0.9)
        this.pushNote(bassMidi, 0, 0.9, 'bass')
      }
    }

    // arpeggio / melody
    if (rnd() < density * 0.92) {
      this.arpDegree += Math.floor(rnd() * 5) - 2
      this.arpDegree = Math.max(-2, Math.min(14, this.arpDegree))
      const deg = chordDeg + this.arpDegree
      const oct = inst === 'marimba' ? 1 : 1
      const midi = scaleMidi(rootPc, scale, deg, oct)
      const pan = panFromGrid()
      const vel = 0.35 + rnd() * 0.65 * (0.5 + energy * 0.5)
      switch (inst) {
        case 'marimba':
          this.voiceMarimba(t, midi, vel, pan)
          break
        case 'sine-arp':
          this.voiceSineArp(t, midi, vel, pan, stepDur * 1.6)
          break
        case 'shimmer':
          this.voiceShimmer(t, midi, vel, pan)
          break
        case 'deep-space':
          this.voiceDeepSpace(t, midi, vel, pan)
          break
        case 'drone':
          this.voicePad(t, midi, stepDur * 2, vel * 0.6)
          break
        case 'noise-texture':
          this.voiceNoise(t, vel * 0.7, pan, stepDur * 0.9)
          break
        default:
          this.voicePluck(t, midi, vel, pan)
      }
      this.pushNote(midi, pan, vel, 'melody')
    }

    // percussion from high-frequency energy (FFT) / edge density
    const percChance = Math.min(0.95, p.crackle * (inst === 'percussive' ? 1.1 : 0.5))
    if (step % 2 === 1 && rnd() < percChance) {
      const pan = panFromGrid()
      this.voicePerc(t, 0.4 + rnd() * 0.6, pan)
      this.pushNote(84, pan, 0.7, 'perc')
    }

    // sparse shimmer accents
    if (rnd() < p.crackle * 0.18) {
      const midi = scaleMidi(rootPc, scale, Math.floor(rnd() * 6), 2)
      const pan = panFromGrid()
      this.voiceShimmer(t, midi, 0.5 + rnd() * 0.5, pan)
      this.pushNote(midi, pan, 0.6, 'shimmer')
    }
  }

  private rootPc() {
    const root = this.pendingRoot ?? this.params?.root_note ?? 'C'
    return NOTE_TO_PC[root] ?? 0
  }

  private scaleKey() {
    return this.pendingScale ?? this.params?.scale ?? 'major-pentatonic'
  }

  private pendingRoot: string | null = null
  private pendingScale: string | null = null

  setRoot(note: string | null) {
    this.pendingRoot = note
  }

  setScale(scale: string | null) {
    this.pendingScale = scale
  }

  getScaleOptions() {
    return Object.entries(SCALES).map(([k, v]) => ({ key: k, name: v.name }))
  }

  private pushNote(pitch: number, pan: number, velocity: number, kind: NoteEvent['kind']) {
    this.notes.push({ pitch, pan, velocity, age: 0, kind })
    if (this.notes.length > 64) this.notes.shift()
  }

  private pruneNotes(now: number) {
    if (now - this.lastNow < 0.03) return
    const dt = now - this.lastNow
    this.lastNow = now
    for (const n of this.notes) n.age += dt
    this.notes = this.notes.filter((n) => n.age < 2.4)
  }

  // ------------------------------------------------------------- analysis

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

  getNotes(): NoteEvent[] {
    return this.notes
  }

  getStep() {
    return this.step
  }

  getAnalyser() {
    return this.analyser
  }

  dispose() {
    this.stop()
    this.ctx?.close()
    this.ctx = null
  }
}

export const engine = new SonificationEngine()
