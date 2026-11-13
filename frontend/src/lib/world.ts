/**
 * The world behind the cabinet.
 *
 * Each record carries a *scene*: the sky, the weather, the light and the one
 * living creature in the meadow. A hurricane arrives with a Ghibli storm —
 * bruised teal sky, slanting rain, a bending tree, lightning — while a clear
 * night over the cities gets a star field and an aurora. The scene is derived
 * from the record's physical model plus a per-record override, so switching
 * discs changes the world you are standing in.
 */

export type SceneKind = 'meadow' | 'storm' | 'night' | 'aurora' | 'fire' | 'space'

export interface Scene {
  kind: SceneKind
  label: string
  /** the painted, hand-drawn backdrop behind the cabinet */
  art: string
  /** true when the art is dark and UI on top of it must be light */
  dark: boolean
  /** where the meadow horizon sits in the art, as a fraction of its height */
  horizon: number
  /** one line of weather, shown in the status strip */
  weather: string
  sky: [string, string, string, string]
  sun: { x: number; y: number; color: string; size: number; strength: number }
  hills: [string, string, string]
  meadow: [string, string, string]
  cloud: string
  cloudCount: number
  cloudOpacity: number
  cloudSpeed: number
  rain: number
  snow: number
  motes: number
  lightning: number
  aurora: number
  stars: number
  fireflies: number
  /** how strongly the cabinet's own glow lights the ground */
  glow: string
  vignette: string
  grass: [string, string]
  girl: { coat: string; hair: string; trim: string; hat: string | null }
}

const GIRL = {
  coat: '#8e5560',
  hair: '#3b2a2a',
  trim: '#f6e7cf',
  hat: null as string | null,
}

export const SCENES: Record<SceneKind, Scene> = {
  meadow: {
    kind: 'meadow',
    art: '/art/world-meadow.webp',
    dark: false,
    horizon: 0.42,
    label: 'Golden meadow',
    weather: 'late light, pollen drifting',
    sky: ['#a9d3d3', '#c6e0d4', '#ecdfba', '#f8e3b6'],
    sun: { x: 50, y: 62, color: '#ffe4a3', size: 62, strength: 0.95 },
    hills: ['#c4d8a8', '#a9c795', '#8fb280'],
    meadow: ['#dcdc9c', '#bfcf8c', '#93b47f'],
    cloud: '#fffaf0',
    cloudCount: 7,
    cloudOpacity: 0.75,
    cloudSpeed: 1,
    rain: 0,
    snow: 0,
    motes: 24,
    lightning: 0,
    aurora: 0,
    stars: 0,
    fireflies: 0,
    glow: 'rgba(255,190,110,.55)',
    vignette: 'rgba(74,53,33,.30)',
    grass: ['#5f7f4e', '#a7c07a'],
    girl: GIRL,
  },
  storm: {
    kind: 'storm',
    art: '/art/world-storm.webp',
    dark: true,
    horizon: 0.55,
    label: 'Ghibli storm',
    weather: 'hurricane — rain bending the grass',
    sky: ['#4d6f78', '#5d7f84', '#8f9d92', '#b3ac95'],
    sun: { x: 66, y: 40, color: '#dce7de', size: 40, strength: 0.35 },
    hills: ['#6f8a74', '#5c7867', '#465f54'],
    meadow: ['#8aa070', '#748c63', '#546d51'],
    cloud: '#dfe6e2',
    cloudCount: 11,
    cloudOpacity: 0.95,
    cloudSpeed: 2.4,
    rain: 150,
    snow: 0,
    motes: 0,
    lightning: 1,
    aurora: 0,
    stars: 0,
    fireflies: 0,
    glow: 'rgba(255,176,96,.5)',
    vignette: 'rgba(22,34,32,.52)',
    grass: ['#42604a', '#7d9568'],
    girl: { coat: '#f2c84b', hair: '#3b2a2a', trim: '#dfe6e2', hat: '#f2c84b' },
  },
  night: {
    kind: 'night',
    art: '/art/world-night.webp',
    dark: true,
    horizon: 0.60,
    label: 'City night',
    weather: 'clear night, towns glowing',
    sky: ['#182a44', '#213a56', '#365066', '#6c6f6a'],
    sun: { x: 62, y: 58, color: '#ffe7b0', size: 22, strength: 0.5 },
    hills: ['#2c4152', '#243647', '#1b2a37'],
    meadow: ['#3a4a44', '#2f3d3a', '#22302e'],
    cloud: '#8fa5b8',
    cloudCount: 4,
    cloudOpacity: 0.28,
    cloudSpeed: 0.6,
    rain: 0,
    snow: 0,
    motes: 0,
    lightning: 0,
    aurora: 0,
    stars: 1,
    fireflies: 18,
    glow: 'rgba(255,190,110,.75)',
    vignette: 'rgba(8,14,24,.6)',
    grass: ['#243a34', '#4b6653'],
    girl: GIRL,
  },
  aurora: {
    kind: 'aurora',
    art: '/art/world-aurora.webp',
    dark: true,
    horizon: 0.62,
    label: 'Aurora night',
    weather: 'aurora over the sea ice',
    sky: ['#0d1b30', '#13294a', '#1d3f5c', '#4c5f66'],
    sun: { x: 24, y: 46, color: '#a8f0d0', size: 30, strength: 0.4 },
    hills: ['#274a4c', '#1e3b3f', '#152b30'],
    meadow: ['#2f4d4a', '#26403f', '#1a2f30'],
    cloud: '#8fb8c8',
    cloudCount: 3,
    cloudOpacity: 0.22,
    cloudSpeed: 0.5,
    rain: 0,
    snow: 40,
    motes: 0,
    lightning: 0,
    aurora: 1,
    stars: 1,
    fireflies: 0,
    glow: 'rgba(190,255,220,.6)',
    vignette: 'rgba(6,16,26,.58)',
    grass: ['#1f3a38', '#3f6157'],
    girl: { coat: '#5f7f9e', hair: '#2c2432', trim: '#e8f6f0', hat: '#cfd9df' },
  },
  fire: {
    kind: 'fire',
    art: '/art/world-fire.webp',
    dark: true,
    horizon: 0.58,
    label: 'Smoke summer',
    weather: 'haze and drifting ash',
    sky: ['#b3a083', '#c9a87e', '#d9b487', '#e6b98a'],
    sun: { x: 58, y: 52, color: '#ffc07a', size: 48, strength: 0.85 },
    hills: ['#b79a6f', '#a5835c', '#8a6f4f'],
    meadow: ['#c7ab7b', '#ad9469', '#8d7a57'],
    cloud: '#e8d6bd',
    cloudCount: 8,
    cloudOpacity: 0.6,
    cloudSpeed: 0.9,
    rain: 0,
    snow: 0,
    motes: 30,
    lightning: 0,
    aurora: 0,
    stars: 0,
    fireflies: 0,
    glow: 'rgba(255,150,60,.7)',
    vignette: 'rgba(70,44,22,.46)',
    grass: ['#84714c', '#b8a171'],
    girl: GIRL,
  },
  space: {
    kind: 'space',
    art: '/art/world-space.webp',
    dark: true,
    horizon: 0.78,
    label: 'Deep space',
    weather: 'above the atmosphere',
    sky: ['#0a0f24', '#141b38', '#25203f', '#3a2a45'],
    sun: { x: 78, y: 34, color: '#ffe0f0', size: 26, strength: 0.7 },
    hills: ['#22305a', '#1b2748', '#141d38'],
    meadow: ['#2a2f52', '#202442', '#171a33'],
    cloud: '#9aa6d8',
    cloudCount: 5,
    cloudOpacity: 0.35,
    cloudSpeed: 0.7,
    rain: 0,
    snow: 0,
    motes: 0,
    lightning: 0,
    aurora: 0,
    stars: 1,
    fireflies: 0,
    glow: 'rgba(190,200,255,.5)',
    vignette: 'rgba(6,8,20,.62)',
    grass: ['#1b1f3a', '#343a63'],
    girl: GIRL,
  },
}

/** a per-record override, so two storms can still feel like different places */
const BY_ID: Record<string, SceneKind> = {
  'night-lights': 'night',
  'ocean-currents': 'aurora',
  'perpetual-ocean': 'aurora',
  'hurricane-maria': 'storm',
  lightning: 'storm',
  'atmospheric-river': 'storm',
  'wildfire-smoke': 'fire',
  'caldwell-73': 'space',
}

export function sceneFor(model: string, id?: string): Scene {
  if (id && BY_ID[id]) return SCENES[BY_ID[id]]
  switch (model) {
    case 'storm':
      return SCENES.storm
    case 'fire':
      return SCENES.fire
    case 'city':
      return SCENES.night
    case 'space':
      return SCENES.space
    case 'ocean':
      return SCENES.aurora
    default:
      return SCENES.meadow
  }
}
