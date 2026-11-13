import { useRef, useState } from 'react'
import { Loader2, Pause, Play, Upload } from 'lucide-react'
import { api, imgFromFile } from '../lib/api'
import { phenomena, type Spec } from '../lib/audio/phenomena'
import { useUI } from '../lib/store'
import { FrameScanner } from '../components/FrameScanner'
import { Spectrum } from '../components/Spectrum'
import type { AnalyzeResponse } from '../lib/types'

const MODELS = [
  ['wind', 'Wind', 'filtered-noise airflow'],
  ['storm', 'Storm', 'rain, thunder, lightning'],
  ['fire', 'Fire', 'combustion crackle'],
  ['ocean', 'Ocean', 'surge and swell'],
  ['city', 'City', 'twinkling lights'],
  ['canopy', 'Canopy', 'resonant pings'],
  ['plume', 'Plume', 'airy transport'],
  ['space', 'Space', 'NASA scan method'],
] as const

const SAMPLES = [
  ['hurricane-maria', 'storm'],
  ['wildfire-smoke', 'fire'],
  ['wind', 'wind'],
  ['ocean-currents', 'ocean'],
  ['night-lights', 'city'],
  ['forest-height', 'canopy'],
] as const

/**
 * Scan any frame: upload or pick a bundled NASA frame, choose which physical
 * model should read it, and hear the result. The model is a *synthesis*
 * choice, not a musical one — the mapping is fixed and printed on screen.
 */
export function ScanPage() {
  const [result, setResult] = useState<(AnalyzeResponse & { id?: string }) | null>(null)
  const [model, setModel] = useState<string>('wind')
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [playing, setPlaying] = useState(false)
  const [energy, setEnergy] = useState<Float32Array | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const announce = useUI((s) => s.announce)
  const setPlayingStore = useUI((s) => s.setPlaying)

  const asSpec = (r: AnalyzeResponse | Spec): Spec => r as Spec

  const runFile = async (file: File) => {
    try {
      setBusy(true)
      setError('')
      setPreview(await imgFromFile(file))
      const res = await api.analyze(file, model)
      setResult(res)
      phenomena.load(asSpec(res))
      announce(`${file.name} measured and read as ${model}. ${res.explain}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scan failed')
    } finally {
      setBusy(false)
    }
  }

  const runSample = async (id: string, m: string) => {
    try {
      setBusy(true)
      setModel(m)
      const spec = await api.spec(id)
      const res = await api.spec(id)
      setResult({
        filename: id,
        width: 0,
        height: 0,
        model: spec.model,
        title: spec.title,
        explain: spec.explain,
        duration: spec.duration,
        layers: spec.layers,
        mapping: spec.mapping,
        grid: spec.grid,
        frame_stats: spec.frame_stats,
        id,
      })
      setPreview(api.framePngUrl(id))
      phenomena.load(res)
      announce(`${id}: ${spec.explain}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scan failed')
    } finally {
      setBusy(false)
    }
  }

  const toggle = async () => {
    if (!result) return
    if (playing) {
      phenomena.stop()
      setPlaying(false)
      setPlayingStore(false)
      return
    }
    phenomena.onEnergy = (v) => setEnergy(v)
    await phenomena.init()
    if (!phenomena.getSpec()) phenomena.load(asSpec(result))
    await phenomena.play(0)
    setPlaying(true)
    setPlayingStore(true)
  }

  return (
    <div className="mx-auto max-w-[1180px] px-3 py-4 sm:px-5">
      <header className="tt-paper mb-3 p-3.5 sm:p-4">
        <p className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-ink-soft">
          measure · map · synthesise
        </p>
        <h1 className="mt-0.5 font-display text-2xl font-semibold text-ink sm:text-3xl">Read any frame</h1>
        <p className="mt-1.5 max-w-2xl text-[12px] font-semibold leading-relaxed text-ink/75">
          Drop in a NASA frame — or any image — and choose which physical process should read it.
          The model changes the synthesis, never the measurement: the same pixels can be heard as
          wind, fire or water, and every mapping is printed underneath.
        </p>
      </header>

      <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
        <div className="flex flex-col gap-2.5">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const f = e.dataTransfer.files?.[0]
              if (f) void runFile(f)
            }}
            className="tt-paper flex min-h-36 flex-col items-center justify-center gap-2 border-dashed p-4 text-center"
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void runFile(f)
              }}
            />
            <Upload size={18} className="text-ink-soft/70" />
            <button
              onClick={() => inputRef.current?.click()}
              className="rounded-full border-2 border-[#a9773d] bg-gradient-to-b from-[#ffe9b8] to-[#e0a95f] px-3.5 py-1.5 text-[11.5px] font-bold text-ink shadow-[0_2px_0_#a9773d] transition active:translate-y-[1px] active:shadow-none"
            >
              choose a frame
            </button>
            <p className="font-display text-[9px] font-bold uppercase tracking-wider text-ink-soft/70">
              png · jpg · webp · drag or drop
            </p>
            {busy && (
              <p className="flex items-center gap-1.5 text-[10.5px] font-semibold text-[#a2641f]">
                <Loader2 size={11} className="animate-spin" /> measuring…
              </p>
            )}
            {error && <p className="text-[10.5px] font-semibold text-red-700">{error}</p>}
          </div>

          <div className="tt-paper p-2.5">
            <p className="mb-1.5 font-display text-[9.5px] font-bold uppercase tracking-[0.18em] text-ink-soft">
              which physical model reads it
            </p>
            <div className="grid grid-cols-2 gap-1">
              {MODELS.map(([key, label, blurb]) => (
                <button
                  key={key}
                  onClick={() => setModel(key)}
                  aria-pressed={model === key}
                  className={`rounded-lg px-2 py-1 text-left transition ${
                    model === key
                      ? 'bg-[#e8b96f]/45 ring-2 ring-[#a9773d]'
                      : 'bg-[#fff8e8]/60 hover:bg-[#fff8e8]'
                  }`}
                >
                  <span className="block text-[10.5px] font-bold text-ink">{label}</span>
                  <span className="block truncate text-[8.5px] font-semibold text-ink-soft">{blurb}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="tt-paper p-2.5">
            <p className="mb-1.5 font-display text-[9.5px] font-bold uppercase tracking-[0.18em] text-ink-soft">
              or read a bundled NASA frame
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {SAMPLES.map(([id, m]) => (
                <button
                  key={id}
                  onClick={() => void runSample(id, m)}
                  className="overflow-hidden rounded-lg border-2 border-[#d8b077] transition hover:border-[#a9773d]"
                  aria-label={`Read ${id} as ${m}`}
                >
                  <img src={api.frameUrl(id)} alt="" className="h-12 w-full object-cover" />
                  <span className="block truncate bg-[#3a2716] px-1 py-0.5 text-[8px] font-semibold text-[#ffe9b8]">
                    {m} · {id}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {preview && (
            <div className="overflow-hidden rounded-[18px] border-2 border-[#a9773d]">
              <img src={preview} alt="Frame being measured" className="max-h-56 w-full bg-black/40 object-contain" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2.5">
          {!result && (
            <div className="tt-paper flex h-full min-h-48 flex-col items-center justify-center gap-1.5 p-5 text-center">
              <p className="font-display text-[13px] font-semibold text-ink-soft">Measurements appear here</p>
              <p className="max-w-xs text-[10.5px] font-semibold leading-relaxed text-ink-soft/80">
                A 6 × 12 grid of cells, each carrying brightness, saturation, hue, texture,
                gradient, and the colour fractions (hot / green / water / white / dark) that the
                phenomenon models read.
              </p>
            </div>
          )}

          {result && (
            <>
              <FrameScanner
                imageUrl={result.id ? api.framePngUrl(result.id) : preview ?? ''}
                cells={result.grid.cells}
                cols={result.grid.cols}
                rows={result.grid.rows}
                model={result.model}
                energy={energy}
              />

              <div className="tt-paper p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-display text-[13px] font-semibold text-ink">{result.title}</p>
                    <p className="font-display text-[9px] font-bold uppercase tracking-wider text-ink-soft">
                      {result.model} · {result.layers.length} layers · {result.duration}s
                    </p>
                  </div>
                  <button
                    onClick={() => void toggle()}
                    className="flex shrink-0 items-center gap-1.5 rounded-full border-2 border-[#a9773d] bg-gradient-to-b from-[#ffe9b8] to-[#e0a95f] px-2.5 py-1.5 text-[11px] font-bold text-ink shadow-[0_2px_0_#a9773d] transition active:translate-y-[1px] active:shadow-none"
                  >
                    {playing ? <Pause size={11} fill="currentColor" /> : <Play size={11} fill="currentColor" />}
                    {playing ? 'Pause' : 'Play'}
                  </button>
                </div>
                <p className="mt-1.5 text-[10.5px] font-semibold leading-relaxed text-ink/80">{result.explain}</p>
              </div>

              <div className="h-20 rounded-[16px] border-2 border-[#d8b077] bg-[#3a2716] p-1.5">
                <Spectrum accent="#ffcf7d" />
              </div>

              <div className="tt-paper p-2.5">
                <p className="mb-1.5 font-display text-[9.5px] font-bold uppercase tracking-[0.18em] text-ink-soft">
                  mapping
                </p>
                <dl className="flex flex-col gap-1">
                  {Object.entries(result.mapping).map(([k, v]) => (
                    <div key={k} className="flex items-baseline gap-1.5 text-[10px]">
                      <dt className="w-[40%] shrink-0 font-bold text-[#8a5a1c]">{k}</dt>
                      <dd className="text-ink/80">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
