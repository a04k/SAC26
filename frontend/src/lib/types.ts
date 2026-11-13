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
  model: 'wind' | 'storm' | 'fire' | 'ocean' | 'city' | 'canopy' | 'plume' | 'space'
  series: { asset: string; label: string }[]
}

export type { Spec, SpecCell, SpecLayer, PlaySnapshot } from './audio/phenomena'

export const ELEMENTS = ['storms', 'wind', 'fire', 'ocean', 'land', 'space'] as const
export type Element = (typeof ELEMENTS)[number]

export interface AnalyzeResponse {
  filename: string
  width: number
  height: number
  model: string
  title: string
  explain: string
  duration: number
  layers: import('./audio/phenomena').SpecLayer[]
  /** one line: what the frame measures → what the ear hears */
  mapping: string
  grid: { cols: number; rows: number; cells: import('./audio/phenomena').SpecCell[] }
  frame_stats: Record<string, number>
}

export const ELEMENT_META: Record<string, { label: string; blurb: string }> = {
  storms: { label: 'Storms', blurb: 'Hurricanes and thunderstorms' },
  wind: { label: 'Wind & air', blurb: 'Winds, aerosols, carbon' },
  fire: { label: 'Fire', blurb: 'Wildfire smoke' },
  ocean: { label: 'Ocean', blurb: 'Currents and sea temperature' },
  land: { label: 'Land', blurb: 'Cities and forests' },
  space: { label: 'Space', blurb: "NASA's own sonification method" },
}
