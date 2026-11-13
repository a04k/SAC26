import { create } from 'zustand'

/**
 * Cabinet state.
 *
 * `powered` is the physical switch: off means the artwork is unlit and the
 * carousel is dark. `loaded` is what sits in the cradle (a disc has travelled
 * there). `playing` is the needle being down.
 */
interface UIState {
  started: boolean
  powered: boolean
  selectedId: string
  loadedId: string
  isPlaying: boolean
  volume: number
  highContrast: boolean
  reduceMotion: boolean
  mechanismMuted: boolean
  announcement: string
  /** live analyser level, published so the world can react to the sound */
  level: number

  setStarted: (v: boolean) => void
  setPowered: (v: boolean) => void
  select: (id: string) => void
  setLoaded: (id: string) => void
  setPlaying: (v: boolean) => void
  setVolume: (v: number) => void
  setHighContrast: (v: boolean) => void
  setReduceMotion: (v: boolean) => void
  setMechanismMuted: (v: boolean) => void
  setLevel: (v: number) => void
  announce: (msg: string) => void
}

export const useUI = create<UIState>((set) => ({
  started: false,
  powered: false,
  selectedId: 'night-lights',
  loadedId: '',
  isPlaying: false,
  volume: 0.72,
  highContrast: false,
  reduceMotion: false,
  mechanismMuted: false,
  announcement: '',
  level: 0,

  setStarted: (v) => set({ started: v }),
  setPowered: (v) => set({ powered: v, ...(v ? {} : { isPlaying: false }) }),
  select: (id) => set({ selectedId: id }),
  setLoaded: (id) => set({ loadedId: id }),
  setPlaying: (v) => set({ isPlaying: v }),
  setVolume: (v) => set({ volume: v }),
  setHighContrast: (v) => set({ highContrast: v }),
  setReduceMotion: (v) => set({ reduceMotion: v }),
  setMechanismMuted: (v) => set({ mechanismMuted: v }),
  setLevel: (v) => set({ level: v }),
  announce: (msg) => set({ announcement: msg }),
}))
