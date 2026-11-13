import { create } from 'zustand'

interface UIState {
  selectedId: string
  isPlaying: boolean
  volume: number
  showOverlay: boolean
  highContrast: boolean
  reduceMotion: boolean
  announcement: string

  select: (id: string) => void
  setPlaying: (v: boolean) => void
  setVolume: (v: number) => void
  setShowOverlay: (v: boolean) => void
  setHighContrast: (v: boolean) => void
  setReduceMotion: (v: boolean) => void
  announce: (msg: string) => void
}

export const useUI = create<UIState>((set) => ({
  selectedId: 'night-lights',
  isPlaying: false,
  volume: 0.75,
  showOverlay: true,
  highContrast: false,
  reduceMotion: false,
  announcement: '',

  select: (id) => set({ selectedId: id }),
  setPlaying: (v) => set({ isPlaying: v }),
  setVolume: (v) => set({ volume: v }),
  setShowOverlay: (v) => set({ showOverlay: v }),
  setHighContrast: (v) => set({ highContrast: v }),
  setReduceMotion: (v) => set({ reduceMotion: v }),
  announce: (msg) => set({ announcement: msg }),
}))
