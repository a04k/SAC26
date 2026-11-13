import type { AnalyzeResponse, Dataset, ScanResponse } from './types'

const BASE = (import.meta.env?.VITE_API_URL as string | undefined) ?? ''

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${path}`)
  return res.json() as Promise<T>
}

export const api = {
  datasets: () => json<Dataset[]>('/api/datasets'),

  dataset: (id: string) => json<Dataset>(`/api/datasets/${id}`),

  /** The measured score for one EIC frame (per-band tones + optional series). */
  scan: (id: string) => json<ScanResponse>(`/api/datasets/${id}/scan`),

  /** Per-row FFT energy, for drawing where the sound comes from. */
  spectrum: (id: string) =>
    json<{ rows: number; bands: { band: number; energy: number[] }[] }>(
      `/api/datasets/${id}/spectrum`,
    ),

  frameUrl: (id: string) => `${BASE}/api/datasets/${id}/frame.png`,

  assetUrl: (id: string, asset: string) =>
    `${BASE}/api/datasets/${id}/assets/${asset}.png`,

  renderUrl: (id: string) => `${BASE}/api/datasets/${id}/render.wav`,

  analyze: async (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return json<AnalyzeResponse>('/api/analyze', { method: 'POST', body: form })
  },
}

export function imgFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
