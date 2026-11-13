import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, ExternalLink, Pause, Play, RotateCcw, Volume2, Waves } from 'lucide-react'
import { api } from '../lib/api'
import { useQueryClient } from '@tanstack/react-query'
import { phenomena, type PlaySnapshot, type Spec } from '../lib/audio/phenomena'
import { mechanism } from '../lib/audio/mechanism'
import { useUI } from '../lib/store'
import { flyDisc } from '../lib/discFlight'
import type { Dataset } from '../lib/types'
import { Jukebox } from '../components/Jukebox'
import { DiscCrate } from '../components/DiscCrate'
import { FrameScanner } from '../components/FrameScanner'
import { LoadingDoor } from '../components/LoadingDoor'
import { Spectrum } from '../components/Spectrum'

const MODEL_WORD: Record<string, string> = {
  wind: 'Airflow',
  storm: 'Storm',
  fire: 'Fire',
  ocean: 'Ocean',
  city: 'City lights',
  canopy: 'Canopy',
  plume: 'Plume',
  space: 'Deep space',
}

const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`

/** Everything the cabinet can't show once the needle is down. */
function Deck({
  dataset,
  spec,
  loading,
  onClose,
  datasets,
  onPick,
}: {
  dataset: Dataset
  spec: Spec | null
  loading: boolean
  onClose: () => void
  datasets: Dataset[]
  onPick: (id: string) => void
}) {
  const { isPlaying, setPlaying, volume, setVolume, announce } = useUI()
  const [snap, setSnap] = useState<PlaySnapshot>({ playing: false, position: 0, duration: 0, level: 0 })
  const [energy, setEnergy] = useState<Float32Array | null>(null)

  useEffect(() => {
    phenomena.onSnapshot = setSnap
    phenomena.onEnergy = (v) => setEnergy(v)
    phenomena.onEnded = () => {
      setPlaying(false)
      mechanism.lift()
    }
    return () => {
      phenomena.onSnapshot = null
      phenomena.onEnergy = null
      phenomena.onEnded = null
    }
  }, [setPlaying])

  useEffect(() => {
    phenomena.setVolume(volume)
  }, [volume])

  const progress = snap.duration ? snap.position / snap.duration : 0

  const toggle = useCallback(async () => {
    if (!spec) return
    if (isPlaying) {
      phenomena.stop()
      setPlaying(false)
      announce('Needle lifted.')
      return
    }
    await phenomena.init()
    if (phenomena.getSpec() !== spec) phenomena.load(spec)
    await phenomena.play(0)
    setPlaying(true)
    announce(`${dataset.short}. ${spec.explain}`)
  }, [spec, isPlaying, dataset, setPlaying, announce])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT'].includes(el.tagName)) return
      if (e.code === 'Space') {
        e.preventDefault()
        void toggle()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle])

  return (
    <section className="open-door mx-auto mt-4 w-full max-w-[1180px]" aria-label="Analysis deck">
      <div className="tt-paper relative overflow-hidden p-3 sm:p-4">
        {/* the deck's little brass rail */}
        <div className="pointer-events-none absolute inset-x-6 top-0 h-[3px] rounded-b bg-gradient-to-r from-transparent via-[#d8b077] to-transparent" />

        <header className="mb-2.5 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-ink-soft/80">
              side A · track {String(datasets.findIndex((d) => d.id === dataset.id) + 1).padStart(2, '0')} ·{' '}
              {MODEL_WORD[dataset.model] ?? dataset.model}
            </p>
            <h2 className="mt-0.5 font-display text-xl font-semibold leading-tight text-ink sm:text-2xl">
              {dataset.short}
            </h2>
            <p className="mt-0.5 text-[11.5px] font-semibold text-ink-soft">
              {dataset.title} · {dataset.year_range} · {dataset.sensor}
            </p>
          </div>
          <button
            onClick={onClose}
            className="tt-chip shrink-0 px-3 py-1.5 text-[11px] font-bold text-ink transition hover:bg-[#f6e3ba]"
          >
            close the deck
          </button>
        </header>

        <div className="grid gap-3 lg:grid-cols-[1.3fr_1fr]">
          <div className="flex flex-col gap-2.5">
            {spec ? (
              <FrameScanner
                imageUrl={api.framePngUrl(dataset.id)}
                cells={spec.grid.cells}
                cols={spec.grid.cols}
                rows={spec.grid.rows}
                model={spec.model}
                energy={energy}
              />
            ) : (
              <div className="flex aspect-[16/9] items-center justify-center rounded-[18px] border-2 border-[#d8b077] bg-[#3a2716] text-[#ffe9b8]/70">
                <LoadingDoor label={loading ? 'Measuring the frame…' : 'No spec yet'} />
              </div>
            )}

            <div className="tt-chip mt-2 flex items-center gap-2.5 px-2.5 py-2">
              <button
                onClick={() => void toggle()}
                disabled={!spec}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[#a9773d] bg-gradient-to-b from-[#ffe9b8] to-[#e0a95f] text-ink shadow-[0_2px_0_#a9773d] transition active:translate-y-[1px] active:shadow-none disabled:opacity-40"
              >
                {isPlaying ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" className="translate-x-[1px]" />}
              </button>
              <div className="min-w-0 flex-1">
                <div className="relative h-2 overflow-hidden rounded-full bg-[#e6d0a4] shadow-[0_1px_2px_rgba(90,60,20,.35)_inset]">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#d98b2b] to-[#f7c96b]"
                    style={{ width: `${progress * 100}%` }}
                  />
                  <div
                    className="absolute inset-y-0 w-[3px] rounded-full bg-[#4a3521]/70"
                    style={{ left: `calc(${progress * 100}% - 1.5px)` }}
                  />
                </div>
                <p className="mt-1 font-mono text-[9.5px] font-semibold text-ink-soft">
                  {fmt(snap.position)} / {fmt(snap.duration || (spec?.duration ?? 0))} · level{' '}
                  {snap.level.toFixed(2)}
                </p>
              </div>
              <Volume2 size={13} className="shrink-0 text-ink-soft" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                aria-label="Volume"
                className="h-9 w-16 shrink-0 cursor-pointer accent-[#c9832b]"
              />
              <button
                onClick={() => {
                  phenomena.stop()
                  void phenomena.play(0)
                  setPlaying(true)
                }}
                disabled={!spec}
                aria-label="Restart"
                className="shrink-0 rounded-full p-1.5 text-ink-soft transition hover:text-ink disabled:opacity-30"
              >
                <RotateCcw size={13} />
              </button>
              <a
                href={api.renderUrl(dataset.id)}
                download
                aria-label="Download the WAV render of this track"
                className="flex shrink-0 items-center gap-1 rounded-full border-2 border-[#d8b077] bg-[#fff8e8] px-2 py-1 text-[10px] font-bold text-ink transition hover:bg-[#f6e3ba]"
              >
                <Download size={10} /> WAV
              </a>
            </div>

            <div className="h-24 rounded-[16px] border-2 border-[#d8b077] bg-[#3a2716] p-1.5">
              <Spectrum accent="#ffcf7d" />
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <div className="rounded-[16px] border-2 border-[#d8b077] bg-[#fff8e8]/85 p-2.5">
              <p className="font-display text-[9.5px] font-bold uppercase tracking-[0.2em] text-ink-soft">
                how this frame becomes sound
              </p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-ink/85">
                {spec?.explain ?? (loading ? 'The engine is measuring the frame…' : dataset.description)}
              </p>
            </div>

            {spec && (
              <div className="rounded-[16px] border-2 border-[#d8b077] bg-[#fff8e8]/85 p-2.5">
                <p className="font-display text-[9.5px] font-bold uppercase tracking-[0.2em] text-ink-soft">
                  what is mapped to what
                </p>
                <dl className="mt-1.5 flex flex-col gap-1">
                  {Object.entries(spec.mapping).map(([k, v]) => (
                    <div key={k} className="flex items-baseline gap-2 text-[10.5px] leading-snug">
                      <dt className="w-[38%] shrink-0 font-bold text-[#8a5a1c]">{k}</dt>
                      <dd className="text-ink/80">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            <div className="rounded-[16px] border-2 border-[#d8b077] bg-[#fff8e8]/85 p-2.5">
              <p className="font-display text-[9.5px] font-bold uppercase tracking-[0.2em] text-ink-soft">
                provenance
              </p>
              <p className="mt-1 text-[10.5px] leading-relaxed text-ink/80">{dataset.credit}</p>
              <p className="mt-0.5 text-[10px] text-ink-soft">{dataset.source_frame}</p>
              <a
                href={dataset.svs_url}
                target="_blank"
                rel="noreferrer"
                className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-[#a2641f] hover:text-ink"
              >
                <ExternalLink size={10} /> {dataset.svs_id ? `NASA SVS ${dataset.svs_id}` : 'source page'}
              </a>
            </div>

            <div className="rounded-[16px] border-2 border-[#d8b077] bg-[#fff8e8]/85 p-2.5">
              <p className="mb-1 font-display text-[9.5px] font-bold uppercase tracking-[0.2em] text-ink-soft">
                pull another disc
              </p>
              <ul className="grid grid-cols-2 gap-1">
                {datasets
                  .filter((d) => d.id !== dataset.id)
                  .slice(0, 6)
                  .map((d) => (
                    <li key={d.id}>
                      <button
                        onClick={() => onPick(d.id)}
                        className="flex w-full items-center gap-1.5 rounded-lg px-1 py-1 text-left transition hover:bg-[#f6e3ba]"
                      >
                        <img
                          src={api.frameUrl(d.id)}
                          alt=""
                          className="h-6 w-6 shrink-0 rounded-full object-cover ring-1 ring-[#a9773d]"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[10px] font-bold text-ink">{d.short}</span>
                          <span className="block truncate text-[8px] uppercase tracking-wider text-ink-soft">
                            {MODEL_WORD[d.model] ?? d.model}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t-2 border-dashed border-[#d8b077]/70 pt-2">
          <p className="text-[10px] font-semibold leading-relaxed text-ink-soft/85">
            {dataset.accessibility}
          </p>
          <button
            onClick={onClose}
            className="tt-chip px-2.5 py-1 text-[10.5px] font-bold text-ink transition hover:bg-[#f6e3ba]"
          >
            back to the cabinet
          </button>
        </div>
      </div>
    </section>
  )
}

export function JukeboxPage() {
  const datasetsQuery = useQuery({ queryKey: ['datasets'], queryFn: api.datasets })
  const {
    powered,
    setPowered,
    selectedId,
    select,
    started,
    setStarted,
    isPlaying,
    setPlaying,
    volume,
    announce,
  } = useUI()

  const [deckOpen, setDeckOpen] = useState(false)
  const [spectrum, setSpectrum] = useState<number[]>([])
  const [level, setLevel] = useState(0)
  const [progress, setProgress] = useState(0)
  const [flying, setFlying] = useState(false)
  const cradleRef = useRef<HTMLDivElement>(null)
  const discRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const datasets = datasetsQuery.data ?? []
  const dataset = datasets.find((d) => d.id === selectedId) ?? datasets[0]

  const queryClient = useQueryClient()

  // measure the loaded record in the background as soon as one is chosen; the
  // needle drop only waits for this query, never for a re-render
  const specQuery = useQuery({
    queryKey: ['spec', selectedId],
    queryFn: () => api.spec(selectedId),
    enabled: Boolean(selectedId),
    staleTime: 1000 * 60 * 30,
  })

  const spec = specQuery.data ?? null

  useEffect(() => {
    if (spec) phenomena.load(spec)
  }, [spec])

  useEffect(() => {
    phenomena.setVolume(volume)
  }, [volume])

  // meter + halo data
  useEffect(() => {
    let raf = 0
    let last = 0
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop)
      if (t - last < 80) return
      last = t
      setLevel(phenomena.getLevel())
      setProgress(phenomena.progress)
      const d = phenomena.getFrequencyData()
      if (d) {
        const out: number[] = []
        for (let i = 0; i < 26; i++) out.push(d[Math.floor((i / 26) * d.length * 0.5)] / 255)
        setSpectrum(out)
      } else if (spectrum.length) {
        setSpectrum([])
      }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const play = useCallback(
    async (openDeck = false) => {
      if (!spec) return
      await phenomena.init()
      if (phenomena.getSpec() !== spec) phenomena.load(spec)
      mechanism.needle()
      await phenomena.play(0)
      setPlaying(true)
      if (openDeck) setDeckOpen(true)
      announce(`${dataset.short} is playing. ${spec.explain}`)
    },
    [spec, dataset, setPlaying, announce],
  )

  const togglePlay = useCallback(async () => {
    if (!powered) return
    if (isPlaying) {
      phenomena.stop()
      setPlaying(false)
      announce('Needle lifted.')
      return
    }
    await play(true)
  }, [powered, isPlaying, play, setPlaying, announce])

  const throwSwitch = useCallback(() => {
    void mechanism.unlock()
    if (!powered) {
      mechanism.switchOn()
      setPowered(true)
      setStarted(true)
      announce('Cabinet on. Loading a record…')
      // light up, then load a disc and drop the needle on its own
      window.setTimeout(() => void chooseRef.current(useUI.getState().selectedId, true, true), 720)
    } else {
      mechanism.switchOff()
      phenomena.stop()
      setPlaying(false)
      setPowered(false)
      setDeckOpen(false)
      announce('Cabinet off.')
    }
  }, [powered, setPowered, setStarted, setPlaying, announce])

  /** Pull a disc out of the crate; it flies into the cradle, then plays. */
  const chooseDisc = useCallback(
    async (id: string, autoPlay = true, forceFly = false) => {
      if (!powered) {
        setPowered(true)
        setStarted(true)
        mechanism.switchOn()
      }
      const prev = selectedId
      if (id === prev && !forceFly) {
        if (autoPlay && !isPlaying) void play(true)
        return
      }
      const from = discRefs.current[id]?.getBoundingClientRect()
      const to = cradleRef.current?.getBoundingClientRect()
      select(id)
      mechanism.transport()
      phenomena.stop()
      setPlaying(false)
      if (from && to) {
        setFlying(true)
        await flyDisc({ from, to, labelUrl: api.frameUrl(id), duration: 780, lift: 120 })
        setFlying(false)
      }
      mechanism.index(1)
      announce(`Disc loaded: ${datasets.find((d) => d.id === id)?.short ?? id}.`)
      if (autoPlay) {
        // measure the new disc, then drop the needle on it
        try {
          const next = await queryClient.fetchQuery({
            queryKey: ['spec', id],
            queryFn: () => api.spec(id),
            staleTime: 1000 * 60 * 30,
          })
          await phenomena.init()
          phenomena.load(next)
          mechanism.needle()
          await phenomena.play(0)
          setPlaying(true)
          announce(`Playing ${datasets.find((d) => d.id === id)?.short ?? id}. ${next.explain}`)
        } catch {
          /* the spec query will surface the error in the strip */
        }
      }
    },
    [powered, selectedId, isPlaying, play, select, setPowered, setStarted, setPlaying, announce, datasets, queryClient],
  )

  const chooseRef = useRef(chooseDisc)
  chooseRef.current = chooseDisc

  if (datasetsQuery.isLoading) return <LoadingDoor />

  if (datasetsQuery.isError || !dataset) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="tt-paper max-w-md p-6 text-center">
          <h2 className="font-display text-lg font-semibold text-ink">The jukebox is unplugged</h2>
          <p className="mt-1 text-[12px] font-semibold text-ink-soft">
            Start the engine, then reload:
          </p>
          <code className="mt-2 block rounded-lg bg-[#3a2716] p-3 text-left text-[11px] text-[#ffe9b8]">
            cd backend && uvicorn app.main:app --port 8000
          </code>
        </div>
      </div>
    )
  }

  const crateItems = datasets

  return (
    <div className="px-2 pb-8 pt-1 sm:px-4">
      {/* the placard: only until the switch is thrown */}
      {!started && (
        <div className="mx-auto mb-2 max-w-[1180px] px-1 text-center">
          <p className="font-display text-[clamp(18px,3vw,34px)] font-semibold leading-tight text-ink drop-shadow-[0_1px_0_rgba(255,250,235,.8)]">
            The Earth Information Jukebox
          </p>
          <p className="mx-auto mt-1 max-w-[62ch] text-[12px] font-semibold leading-relaxed text-ink/70">
            Thirteen real NASA visualizations, each read by a physical model and turned into the
            sound of the thing itself — wind that gusts, fire that crackles, storms that thunder.
            <span className="text-ink"> Throw the brass switch to begin.</span>
          </p>
        </div>
      )}

      <Jukebox
        datasets={datasets}
        selectedId={selectedId}
        powered={powered}
        playing={isPlaying}
        onPower={throwSwitch}
        onPlay={() => void togglePlay()}
        onStep={(dir) => {
          const i = datasets.findIndex((d) => d.id === selectedId)
          const next = datasets[(i + dir + datasets.length) % datasets.length]
          if (next) void chooseDisc(next.id, true)
        }}
        level={level}
        spectrum={spectrum}
        progress={progress}
        cradleRef={cradleRef}
      />

      <DiscCrate
        datasets={crateItems}
        selectedId={selectedId}
        onPick={(id) => void chooseDisc(id, true)}
        discRefs={discRefs}
      />

      {/* a small honest status strip */}
      <div className="mx-auto mt-2.5 flex max-w-[1180px] flex-wrap items-center justify-between gap-2 px-1 text-[10.5px] font-semibold text-ink-soft">
        <span className="flex items-center gap-1.5">
          <Waves size={12} />
          {powered ? `${datasets.length} records · ${MODEL_WORD[dataset.model] ?? dataset.model} model armed` : 'cabinet off'}
          {flying ? ' · disc in transit…' : ''}
        </span>
        <span>
          {spec ? `${spec.layers.length} synthesis layers · ${spec.duration.toFixed(1)}s · grid ${spec.grid.cols}×${spec.grid.rows}` : 'measuring…'}
        </span>
      </div>

      {!deckOpen && powered && (
        <div className="mx-auto mt-2 flex max-w-[1180px] justify-center">
          <button
            onClick={() => setDeckOpen(true)}
            className="tt-chip px-3.5 py-1.5 text-[11.5px] font-bold text-ink transition hover:bg-[#f6e3ba]"
          >
            open the measurement deck ↓
          </button>
        </div>
      )}

      {deckOpen && (
        <Deck
          dataset={dataset}
          spec={spec}
          loading={specQuery.isLoading}
          datasets={datasets}
          onClose={() => setDeckOpen(false)}
          onPick={(id) => void chooseDisc(id, true)}
        />
      )}
    </div>
  )
}
