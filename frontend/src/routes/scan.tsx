import { useRef, useState } from 'react'
import { Loader2, Play, Square, Upload } from 'lucide-react'
import { api, imgFromFile } from '../lib/api'
import { player } from '../lib/audio/scanner'
import { useUI } from '../lib/store'
import type { AnalyzeResponse } from '../lib/types'
import { BandProfile, PitchTrace, Spectrum, Waveform } from '../components/Visualizers'

const SAMPLES = ['night-lights', 'lightning', 'forest-height', 'ocean-currents']

/**
 * Scan your own frame. Nothing is composed: the uploaded pixels go through the
 * same band scanner as the NASA tracks and come back as tones.
 */
export function ScanPage() {
  const [result, setResult] = useState<AnalyzeResponse | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [playing, setPlaying] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const announce = useUI((s) => s.announce)
  const setPlayingStore = useUI((s) => s.setPlaying)

  const runFile = async (file: File) => {
    try {
      setBusy(true)
      setError('')
      setPreview(await imgFromFile(file))
      const res = await api.analyze(file)
      setResult(res)
      player.load(res.scan, null)
      announce(
        `Scanned ${file.name}. 24 bands, mean pitch ${res.scan.summary.mean_pitch_hz.toFixed(0)} hertz.`,
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scan failed')
    } finally {
      setBusy(false)
    }
  }

  const toggle = async () => {
    if (!result) return
    if (playing) {
      player.stop()
      setPlaying(false)
      setPlayingStore(false)
      return
    }
    await player.init()
    player.load(result.scan, null)
    await player.play(0)
    setPlaying(true)
    setPlayingStore(true)
  }

  const s = result?.scan

  return (
    <div className="h-full overflow-y-auto px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl pb-10">
        <header className="mb-5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300/70">OpenCV · direct sonification</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Scan any frame</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/50">
            Upload a real EIC frame (or any image). Twenty-four horizontal bands are measured —
            brightness, edge density, texture, mean hue — and each band becomes one tone. Bright
            rows sound high, dense rows sound loud and gritty, and their colour places them left
            or right. Nothing is composed, scaled or quantised.
          </p>
        </header>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const f = e.dataTransfer.files?.[0]
                if (f) void runFile(f)
              }}
              className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-white/12 bg-white/[0.02] p-6 text-center"
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
              <Upload size={20} className="text-white/45" />
              <div>
                <p className="text-sm font-medium text-white">Drop an image, or</p>
                <button
                  onClick={() => inputRef.current?.click()}
                  className="mt-1 rounded-lg bg-white px-3 py-1.5 text-[12px] font-semibold text-black transition hover:bg-white/85"
                >
                  choose a file
                </button>
              </div>
              {busy && (
                <p className="flex items-center gap-2 text-[11px] text-cyan-300">
                  <Loader2 size={12} className="animate-spin" /> scanning…
                </p>
              )}
              {error && <p className="text-[11px] text-red-400">{error}</p>}
            </div>

            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-2.5">
              <p className="mb-1.5 text-[9px] uppercase tracking-[0.16em] text-white/40">or scan a bundled NASA frame</p>
              <div className="grid grid-cols-4 gap-1.5">
                {SAMPLES.map((id) => (
                  <button
                    key={id}
                    onClick={async () => {
                      try {
                        setBusy(true)
                        const res = await api.scan(id)
                        setResult({
                          filename: res.dataset.short,
                          width: 0,
                          height: 0,
                          bands: res.scan.bands,
                          scan: res.scan,
                        })
                        setPreview(api.frameUrl(id))
                        player.load(res.scan, res.series ?? null)
                        announce(`Scanned ${res.dataset.short}.`)
                      } catch (e) {
                        setError(e instanceof Error ? e.message : 'Scan failed')
                      } finally {
                        setBusy(false)
                      }
                    }}
                    className="overflow-hidden rounded ring-1 ring-white/10 transition hover:ring-white/40"
                  >
                    <img src={api.frameUrl(id)} alt="" className="h-12 w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {preview && (
              <div className="relative overflow-hidden rounded-xl border border-white/10">
                <img src={preview} alt="Uploaded frame" className="max-h-64 w-full bg-black/40 object-contain" />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2.5">
            {!result && (
              <div className="flex h-full min-h-56 flex-col items-center justify-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 text-center">
                <p className="text-sm text-white/40">Measurements appear here</p>
                <p className="max-w-xs text-[11px] leading-relaxed text-white/25">
                  24 bands × (brightness, saturation, hue, Canny edge density, Laplacian texture,
                  four sampled columns) ≈ 190 measured numbers per frame.
                </p>
              </div>
            )}

            {result && s && (
              <>
                <div className="rounded-2xl border border-white/10 bg-[#070a12]/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="truncate text-[13px] font-semibold text-white">{result.filename}</h2>
                      <p className="font-mono text-[10px] text-white/45">
                        {result.width > 0 ? `${result.width}×${result.height} · ` : ''}
                        {s.summary.mean_pitch_hz.toFixed(0)} Hz mean · {s.summary.mean_edge.toFixed(3)} edge ·{' '}
                        {s.summary.mean_luminance.toFixed(3)} lum
                      </p>
                    </div>
                    <button
                      onClick={() => void toggle()}
                      className="flex shrink-0 items-center gap-1.5 rounded-lg bg-cyan-300 px-3 py-1.5 text-[11px] font-semibold text-black transition hover:bg-cyan-200"
                    >
                      {playing ? <Square size={11} fill="currentColor" /> : <Play size={11} fill="currentColor" />}
                      {playing ? 'Stop' : 'Scan it'}
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    {[
                      ['pitch range', `${Math.min(...s.tones.map((t) => t.freq)).toFixed(0)}–${Math.max(...s.tones.map((t) => t.freq)).toFixed(0)} Hz`],
                      ['loudness range', `${Math.min(...s.tones.map((t) => t.amp)).toFixed(2)}–${Math.max(...s.tones.map((t) => t.amp)).toFixed(2)}`],
                      ['normalisation', `${s.normalization.luminance_p2.toFixed(2)}–${s.normalization.luminance_p98.toFixed(2)}`],
                      ['duration', `${s.duration.toFixed(0)} s`],
                    ].map(([k, v]) => (
                      <div key={k} className="rounded bg-white/[0.04] px-1.5 py-1">
                        <p className="text-[8.5px] uppercase tracking-wider text-white/30">{k}</p>
                        <p className="font-mono text-[10.5px] text-white/80">{v}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="h-20 rounded-xl border border-white/[0.07] bg-[#070a12]/70 p-1.5">
                  <Spectrum />
                </div>
                <div className="h-14 rounded-xl border border-white/[0.07] bg-[#070a12]/70 p-1.5">
                  <Waveform />
                </div>
                <div className="h-44 rounded-xl border border-white/[0.07] bg-[#070a12]/70 p-1.5">
                  <BandProfile bands={s.bands} />
                </div>
                <div className="h-28 rounded-xl border border-white/[0.07] bg-[#070a12]/70 p-1.5">
                  <PitchTrace tones={s.tones} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
