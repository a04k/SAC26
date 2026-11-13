import type { AnalysisResponse, Dataset, Features, SonParams } from './types'

// Vite injects import.meta.env; guard so the module also loads under Node (tests).
const BASE =
  (import.meta.env?.VITE_API_URL as string | undefined) ?? ''

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${path}`)
  return res.json() as Promise<T>
}

export const api = {
  datasets: () => json<Dataset[]>('/api/datasets'),

  dataset: (id: string) => json<Dataset>(`/api/datasets/${id}`),

  analysis: (id: string) =>
    json<{ dataset: Dataset; features: Features; params: SonParams }>(
      `/api/datasets/${id}/features`,
    ),

  frameUrl: (id: string) => `${BASE}/api/datasets/${id}/frame.png`,

  renderUrl: (id: string) => `${BASE}/api/datasets/${id}/render.wav`,

  analyze: async (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return json<AnalysisResponse>('/api/analyze', { method: 'POST', body: form })
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
