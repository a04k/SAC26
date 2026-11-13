export interface Dataset {
  id: string
  title: string
  short: string
  svs_id: string
  svs_url: string
  year_range: string
  description: string
  story: string
  palette: string[]
  instrument: string
  instrument_name: string
  scale: string
  scale_name: string
  base_tempo: number
  mapping: Record<string, string>
  accessibility: string
}

export interface Features {
  mean_hsv: [number, number, number]
  std_hsv: [number, number, number]
  luminance_histogram: number[]
  hue_histogram: number[]
  saturation_histogram: number[]
  edge_density: number
  sharpness: number
  gradient_mean: number
  texture_energy: number
  entropy: number
  colorfulness: number
  spatial_grid: number[]
  grid_size: number
  centroid: [number, number]
  fft_radial: number[]
  dominant_colors: { bgr: [number, number, number]; share: number }[]
  hue_peaks: number[]
  width: number
  height: number
}

export interface SonParams {
  root_note: string
  scale: string
  scale_name: string
  instrument: string
  instrument_name: string
  tempo: number
  density: number
  brightness: number
  energy: number
  warmth: number
  pan_spread: number
  space: number
  crackle: number
  busyness: number
  chord_degrees: number[]
  centroid: [number, number]
}

export interface AnalysisResponse {
  dataset?: Dataset
  features: Features
  params: SonParams
  filename?: string
}

export interface NoteEvent {
  pitch: number
  pan: number
  velocity: number
  age: number
  kind: 'melody' | 'bass' | 'perc' | 'shimmer'
}

export interface EngineSnapshot {
  level: number
  notes: NoteEvent[]
  step: number
  bar: number
  playing: boolean
}
