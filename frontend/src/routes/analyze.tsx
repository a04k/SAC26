import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Eye, FileImage, Loader2, Play, Square, Upload, Volume2 } from 'lucide-react'
import { api, imgFromFile } from '../lib/api'
import { engine } from '../lib/audio/engine'
import { useUI } from '../lib/store'
import type { AnalysisResponse } from '../lib/types'
import { FeatureRadar, Histogram, Polar, SpatialGrid, Spectrum, Waveform } from '../components/Visualizers'

const SAMPLES = ['night-lights', 'ocean-currents', 'lightning', 'forest-height']

export function AnalyzePage() {
  const datasetsQuery = useQuery({ queryKey: ['datasets'], queryFn: api.datasets })
  const [result, setResult] = useState<AnalysisResponse | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'error'>('idle')
  const [error, setError] = useState('')
  const [playing, setPlaying] = useState(false)
  const [drag, setDrag] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const announce = useUI((s) => s.announce)
  const setPlayingStore = useUI((s) => s.setPlaying)

  const analyzeFile = async (file: File) => {
    try {
      setStatus('uploading')
      setError('')
      setPreview(await imgFromFile(file))
      const res = await api.analyze(file)
      setResult(res)
      engine.setParams(res.params, `upload-${file.name}`)
      setStatus('idle')
      announce(
        `Analyzed ${file.name}. Root ${res.params.root_note} ${res.params.scale_name}, ${res.params.tempo} beats per minute, edge density ${(res.features.edge_density * 100).toFixed(1)} percent.`,
      )
    } catch (e) {
      setStatus('error')
      setError(e instanceof Error ? e.message : 'Analysis failed')
    }
  }

  const analyzeSample = async (id: string) => {
    try {
      setStatus('uploading')
      const res = await api.analysis(id)
      setResult(res)
      setPreview(api.frameUrl(id))
      engine.setParams(res.params, id)
      setStatus('idle')
      announce(`Analyzed sample ${res.dataset?.short}.`)
    } catch (e) {
      setStatus('error')
      setError(e instanceof Error ? e.message : 'Analysis failed')
    }
  }

  const toggle = async () => {
    if (playing) {
      engine.stop()
      setPlaying(false)
      setPlayingStore(false)
      return
    }
    await engine.init()
    engine.start()
    setPlaying(true)
    setPlayingStore(true)
  }

  const f = result?.features
  const p = result?.params
  const accent = '#22d3ee'

  return (
    <div className="h-full overflow-y-auto px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-300/70">
            Computer vision · sonification
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Analyze any Earth frame
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/50">
            Drop in a real NASA EIC still (or any image). OpenCV extracts color, edges,
            entropy, texture and spatial layout — then the jukebox engine turns those numbers
            into music you can play right here.
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* ---------- input ---------- */}
          <div className="flex flex-col gap-3">
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDrag(true)
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDrag(false)
                const file = e.dataTransfer.files?.[0]
                if (file) void analyzeFile(file)
              }}
              className={`relative flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center transition ${
                drag ? 'border-cyan-300/70 bg-cyan-400/10' : 'border-white/12 bg-white/[0.02]'
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void analyzeFile(file)
                }}
              />
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
                <Upload size={20} className="text-white/60" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Drop an image, or</p>
                <button
                  onClick={() => inputRef.current?.click()}
                  className="mt-1 rounded-lg bg-white px-3 py-1.5 text-[12px] font-semibold text-black transition hover:bg-white/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  choose a file
                </button>
              </div>
              <p className="text-[11px] text-white/35">
                PNG · JPG · WebP — the frame goes only to your local sonification engine
              </p>
              {status === 'uploading' && (
                <div className="flex items-center gap-2 text-[11px] text-cyan-300">
                  <Loader2 size={12} className="animate-spin" /> running OpenCV pipeline…
                </div>
              )}
              {status === 'error' && <p className="text-[11px] text-red-400">{error}</p>}
            </div>

            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
              <p className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-white/40">
                <FileImage size={11} /> or try a sample frame
              </p>
              <div className="grid grid-cols-4 gap-2">
                {SAMPLES.map((id) => (
                  <button
                    key={id}
                    onClick={() => void analyzeSample(id)}
                    className="group relative overflow-hidden rounded-lg ring-1 ring-white/10 transition hover:ring-white/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    <img src={api.frameUrl(id)} alt="" className="h-14 w-full object-cover" />
                    <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1 py-0.5 text-[8px] text-white/80">
                      {id}
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-white/30">
                {datasetsQuery.data?.length ?? 0} EIC tracks are available in the jukebox.
              </p>
            </div>

            {preview && (
              <div className="overflow-hidden rounded-xl border border-white/10">
                <img src={preview} alt="Uploaded frame preview" className="max-h-64 w-full object-contain bg-black/40" />
              </div>
            )}
          </div>

          {/* ---------- results ---------- */}
          <div className="flex flex-col gap-3">
            {!result && (
              <div className="flex h-full min-h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 text-center">
                <Eye size={20} className="text-white/25" />
                <p className="text-sm text-white/40">Your analysis appears here</p>
                <p className="max-w-xs text-[11px] text-white/25">
                  We measure 16 feature families: HSV statistics, histograms, Canny edges,
                  Sobel gradient energy, local texture variance, Shannon entropy,
                  Hasler–Süsstrunk colorfulness, an 8×8 luminance grid, an FFT radial profile
                  and k-means dominant colors.
                </p>
              </div>
            )}

            {result && p && f && (
              <>
                <div className="rounded-2xl border border-white/10 bg-[#080b16]/70 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-semibold text-white">
                        {result.dataset?.short ?? result.filename}
                      </h2>
                      <p className="mt-0.5 text-[11px] text-white/45">
                        {p.root_note} · {p.scale_name} · {p.tempo} BPM · {p.instrument_name}
                      </p>
                    </div>
                    <button
                      onClick={() => void toggle()}
                      className="flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2 text-[12px] font-semibold text-black transition hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    >
                      {playing ? <Square size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
                      {playing ? 'Stop' : 'Sonify it'}
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      ['Busyness', p.busyness.toFixed(2), 'tempo'],
                      ['Edge density', `${(f.edge_density * 100).toFixed(1)}%`, 'rhythm'],
                      ['Brightness', `${Math.round(f.mean_hsv[2])}`, 'energy'],
                      ['Colorfulness', f.colorfulness.toFixed(0), 'space'],
                    ].map(([label, value, drives]) => (
                      <div key={label} className="rounded-lg bg-white/[0.04] px-2.5 py-2">
                        <p className="text-[9px] uppercase tracking-wider text-white/35">{label}</p>
                        <p className="font-mono text-sm text-white">{value}</p>
                        <p className="text-[9px] text-cyan-300/70">→ {drives}</p>
                      </div>
                    ))}
                  </div>

                  {result.dataset && (
                    <ul className="mt-3 flex flex-col gap-1.5 border-t border-white/5 pt-3">
                      {Object.entries(result.dataset.mapping).map(([visual, audio]) => (
                        <li key={visual} className="flex items-center gap-2 text-[11px]">
                          <Eye size={10} className="shrink-0 text-cyan-300/70" />
                          <span className="text-white/60">{visual}</span>
                          <ArrowRight size={10} className="text-white/25" />
                          <Volume2 size={10} className="shrink-0 text-white/35" />
                          <span className="text-white/85">{audio}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="h-24 rounded-xl border border-white/[0.07] bg-[#080b16]/70 p-1.5">
                    <Spectrum accent={accent} />
                  </div>
                  <div className="h-24 rounded-xl border border-white/[0.07] bg-[#080b16]/70 p-1.5">
                    <Waveform accent={accent} />
                  </div>
                  <div className="h-24 rounded-xl border border-white/[0.07] bg-[#080b16]/70 p-1.5">
                    <Polar accent={accent} />
                  </div>
                  <div className="h-24 rounded-xl border border-white/[0.07] bg-[#080b16]/70 p-1.5">
                    <FeatureRadar features={f} accent={accent} />
                  </div>
                  <div className="h-24 rounded-xl border border-white/[0.07] bg-[#080b16]/70 p-1.5">
                    <SpatialGrid features={f} accent={accent} />
                  </div>
                  <div className="h-24 rounded-xl border border-white/[0.07] bg-[#080b16]/70 p-1.5">
                    <Histogram values={f.hue_histogram} accent="#a78bfa" label="" />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
