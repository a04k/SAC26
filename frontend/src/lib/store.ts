import { create } from 'zustand'

interface UIState {
  selectedId: string
  isPlaying: boolean
  /** true when the audio engine has a decoded/fetched param set for selectedId */
  ready: boolean
  volume: number
  tempoScale: number
  densityScale: number
  brightnessScale: number
  reverb: number
  rootOverride: string | null
  scaleOverride: string | null
  showGrid: boolean
  highContrast: boolean
  reduceMotion: boolean
  announcement: string

  select: (id: string) => void
  setPlaying: (v: boolean) => void
  setReady: (v: boolean) => void
  setVolume: (v: number) => void
  setTempoScale: (v: number) => void
  setDensityScale: (v: number) => void
  setBrightnessScale: (v: number) => void
  setReverb: (v: number) => void
  setRootOverride: (v: string | null) => void
  setScaleOverride: (v: string | null) => void
  setShowGrid: (v: boolean) => void
  setHighContrast: (v: boolean) => void
  setReduceMotion: (v: boolean) => void
  announce: (msg: string) => void
}

export const useUI = create<UIState>((set) => ({
  selectedId: 'night-lights',
  isPlaying: false,
  ready: false,
  volume: 0.72,
  tempoScale: 1,
  densityScale: 1,
  brightnessScale: 1,
  reverb: 0.38,
  rootOverride: null,
  scaleOverride: null,
  showGrid: true,
  highContrast: false,
  reduceMotion: false,
  announcement: '',

  select: (id) => set({ selectedId: id }),
  setPlaying: (v) => set({ isPlaying: v }),
  setReady: (v) => set({ ready: v }),
  setVolume: (v) => set({ volume: v }),
  setTempoScale: (v) => set({ tempoScale: v }),
  setDensityScale: (v) => set({ densityScale: v }),
  setBrightnessScale: (v) => set({ brightnessScale: v }),
  setReverb: (v) => set({ reverb: v }),
  setRootOverride: (v) => set({ rootOverride: v }),
  setScaleOverride: (v) => set({ scaleOverride: v }),
  setShowGrid: (v) => set({ showGrid: v }),
  setHighContrast: (v) => set({ highContrast: v }),
  setReduceMotion: (v) => set({ reduceMotion: v }),
  announce: (msg) => set({ announcement: msg }),
}))
