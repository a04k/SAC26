export interface Dataset {
  id: string
  title: string
  short: string
  svs_id: string
  svs_url: string
  year_range: string
  source_frame: string
  credit: string
  dataset_name: string
  sensor: string
  description: string
  accessibility: string
  element: 'storms' | 'wind' | 'fire' | 'ocean' | 'land' | 'space' | string
  series: { asset: string; label: string }[]
}

export type { ScanPayload, ScanTone, SeriesPayload, ScanSnapshot, ScanSeriesStep } from './audio/scanner'

export interface BandRow {
  band: number
  label: string
  luminance: number
  saturation: number
  hue: number
  edge: number
  texture: number
  samples: number[]
}

export interface ScanResponse {
  dataset: Dataset
  scan: {
    duration: number
    bands: BandRow[]
    tones: import('./audio/scanner').ScanTone[]
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
  series?: {
    duration: number
    steps: import('./audio/scanner').ScanSeriesStep[]
  }
}

export interface AnalyzeResponse {
  filename: string
  width: number
  height: number
  bands: BandRow[]
  scan: ScanResponse['scan']
}

export const ELEMENTS = ['storms', 'wind', 'fire', 'ocean', 'land', 'space'] as const
export type Element = (typeof ELEMENTS)[number]

export const ELEMENT_META: Record<string, { label: string; blurb: string }> = {
  storms: { label: 'Storms', blurb: 'Hurricanes and thunderstorms' },
  wind: { label: 'Wind & air', blurb: 'Winds, aerosols, carbon' },
  fire: { label: 'Fire', blurb: 'Wildfire smoke' },
  ocean: { label: 'Ocean', blurb: 'Currents and sea temperature' },
  land: { label: 'Land', blurb: 'Cities and forests' },
  space: { label: 'Space', blurb: "NASA's own sonification method" },
}
