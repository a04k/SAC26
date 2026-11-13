import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { api } from '../lib/api'
import { useQueryClient } from '@tanstack/react-query'
import { phenomena } from '../lib/audio/phenomena'
import { mechanism } from '../lib/audio/mechanism'
import { useUI } from '../lib/store'
import { flyDisc } from '../lib/discFlight'
import { Cabinet } from '../components/Cabinet'
import { DiscSelector } from '../components/DiscSelector'
import { Intro } from '../components/Intro'
import { NowPlaying } from '../components/NowPlaying'
import { Girl } from '../components/Girl'
import { sceneFor } from '../lib/world'
import { LoadingDoor } from '../components/LoadingDoor'

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

/**
 * The prompt to keep going.
 *
 * The cabinet fills the first screen, so the analysis below it is invisible
 * until you scroll. This strip is centred under the cabinet, states what is
 * down there in plain words, and retires itself the moment you scroll — on
 * phones and desktops alike.
 */
function ScrollPrompt() {
  const [gone, setGone] = useState(false)

  useEffect(() => {
    const onScroll = () => setGone(window.scrollY > 80)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <a
      href="#now-playing"
      onClick={(e) => {
        e.preventDefault()
        document.getElementById('now-playing')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }}
      aria-label="Scroll down for the frame, the measurements and the frame-by-frame analysis"
      className={`pointer-events-auto absolute inset-x-0 bottom-3 z-30 mx-auto flex w-fit max-w-[calc(100%-16px)] items-center gap-2 rounded-full border border-[#ffe9b86b] bg-[#120e08d9] px-3 py-2 text-[#ffe9b8] shadow-[0_10px_24px_-10px_rgba(0,0,0,.95)] backdrop-blur-sm transition-all duration-300 hover:bg-[#120e08] sm:bottom-4 sm:gap-2.5 sm:px-4 ${
        gone ? 'pointer-events-none translate-y-3 opacity-0' : 'scroll-hint opacity-100'
      }`}
    >
      <span className="flex flex-col text-left">
        <span className="font-display text-[9px] font-bold uppercase leading-tight tracking-[0.16em] text-[#ffd79a]">
          scroll for more
        </span>
        <span className="text-[10px] font-semibold leading-tight text-[#ffe9b8d9]">
          the frame · 72 measured cells · every frame in the series
        </span>
      </span>
      <ChevronDown size={16} className="shrink-0 animate-bounce text-[#ffd79a]" />
    </a>
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
    setLevel,
    level: storeLevel,
  } = useUI()

  const [spectrum, setSpectrum] = useState<number[]>([])
  const [progress, setProgress] = useState(0)
  const [flying, setFlying] = useState(false)
  const cradleRef = useRef<HTMLDivElement>(null)
  const discRefs = useRef<Record<string, HTMLElement | null>>({})

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

  // Prime the player with the measured spec, but never yank a record that is
  // already turning: `load()` stops the transport.
  useEffect(() => {
    if (spec && !phenomena.isPlaying && phenomena.getSpec() !== spec) phenomena.load(spec)
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
      const lv = phenomena.getLevel()
      setLevel(lv)
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
  }, [setLevel])

  const play = useCallback(async () => {
    if (!spec) return
    await phenomena.init()
    if (phenomena.getSpec() !== spec) phenomena.load(spec)
    mechanism.needle()
    await phenomena.play(0)
    setPlaying(true)
    announce(`${dataset.short} is playing. ${spec.explain}`)
  }, [spec, dataset, setPlaying, announce])

  const togglePlay = useCallback(async () => {
    if (!powered) return
    if (isPlaying) {
      phenomena.stop()
      setPlaying(false)
      announce('Needle lifted.')
      return
    }
    await play()
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
        if (autoPlay && !isPlaying) void play()
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
          // the disc has landed: bring its real frame and measurement sheet into
          // view, which is where the sound is explained
          if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            document.getElementById('now-playing')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
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

  const [seenIntro, setSeenIntro] = useState(started)

  /** the cut scene finished: remember it, and hand the stage over */
  const finishIntro = useCallback(() => {
    setSeenIntro(true)
    setStarted(true)
    announce('The Earth Information Jukebox. Throw the brass switch to load a record.')
  }, [setStarted, announce])

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

  const scene = sceneFor(dataset.model, dataset.id)
  const intro = !started && !seenIntro

  return (
    <div className={`relative ${started ? 'stage-arrive' : ''}`}>
      {!started && seenIntro && (
        <div className="fixed inset-0 z-[55] animate-[curtain-lift_.9s_ease-out_both]" aria-hidden>
          <img src="/art/world-meadow.webp" alt="" className="h-full w-full object-cover" />
        </div>
      )}

      {intro && <Intro onDone={finishIntro} />}

      {/*
        One stage, full screen. The cabinet is the subject and stands on the
        painted world; the disc button sits on the left, the title above it, and
        everything else waits below the fold.
      */}
      <section
        aria-label="The jukebox"
        className="stage-full relative flex w-full items-end justify-center overflow-hidden pb-[68px] pt-2 sm:pt-3"
      >
        {/* the title column: never overlaps the cabinet */}
        <div className="pointer-events-none absolute left-3 top-3 z-30 w-[clamp(206px,19vw,282px)] sm:left-5 sm:top-5">
          <p className="font-display text-[9px] font-bold uppercase tracking-[0.22em] text-[#ffd79a] drop-shadow-[0_1px_6px_rgba(8,12,20,.95)]">
            NASA Space Apps · 2026
          </p>
          <h1 className="mt-1 font-display text-[clamp(20px,2.2vw,30px)] font-semibold leading-[1.03] text-[#fff6de] drop-shadow-[0_2px_12px_rgba(8,12,20,.95)]">
            The Earth Information Jukebox
          </h1>
          <p className="mt-2 text-[11px] font-semibold leading-relaxed text-[#fff0d4] drop-shadow-[0_1px_7px_rgba(8,12,20,1)]">
            Thirteen real NASA visualizations, each measured by a physical model and played as the
            sound of the thing itself.
          </p>
          {!started ? (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#ffd79a73] bg-[#120e0899] px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[0.13em] text-[#ffe9b8] backdrop-blur-sm">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ffd47a]" />
              throw the brass switch on the cabinet
            </p>
          ) : (
            <p className="mt-2 text-[10px] font-semibold leading-snug text-[#ffeccb] drop-shadow-[0_1px_6px_rgba(8,12,20,.95)]">
              {scene.label} · {scene.weather}
            </p>
          )}
        </div>

        <div className="relative z-10" style={{ width: 'min(80vw, 596px, calc((100svh - 208px) * 0.854))' }}>
          <Cabinet
            datasets={datasets}
            selectedId={selectedId}
            powered={powered}
            playing={isPlaying}
            onPower={throwSwitch}
            onPlay={() => void togglePlay()}
            level={storeLevel}
            spectrum={spectrum}
            progress={progress}
            cradleRef={cradleRef}
          />

          {/* the record label, tucked against the cabinet's left shoulder */}
          <div className="glass-card pointer-events-auto absolute bottom-[24%] left-[calc(100%+16px)] z-30 hidden w-[clamp(188px,15vw,238px)] p-2.5 xl:block">
            <p className="font-display text-[8px] font-bold uppercase tracking-[0.2em] text-[#8a5a1c]">
              now playing
            </p>
            <p className="mt-0.5 font-display text-[14px] font-semibold leading-tight text-ink">
              {dataset.short}
            </p>
            <p className="mt-0.5 line-clamp-3 text-[10px] font-semibold leading-snug text-[#3a2a18d9]">
              {spec?.explain ?? dataset.description}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1">
              <span className="rounded-full bg-[#3a2716d9] px-1.5 py-0.5 text-[7.5px] font-bold uppercase tracking-[0.14em] text-[#ffe9b8]">
                {MODEL_WORD[dataset.model] ?? dataset.model}
              </span>
              {spec && (
                <span className="font-mono text-[7.5px] font-bold text-[#7c6144]">
                  {spec.layers.length} layers · {spec.duration.toFixed(0)}s
                </span>
              )}
              {flying && <span className="text-[7.5px] font-bold text-[#a2641f]">disc in transit…</span>}
            </div>
          </div>

          <Girl
            pose={!started ? 'greet' : isPlaying ? 'listen' : 'point'}
            weather={scene.rain ? 'rain' : scene.kind === 'storm' ? 'wind' : 'calm'}
            level={storeLevel}
            playing={isPlaying}
          />
        </div>

        {/* the record crate: a disc that opens into the whole collection */}
        <DiscSelector
          datasets={datasets}
          selectedId={selectedId}
          playing={isPlaying}
          powered={powered}
          onPick={(id) => void chooseDisc(id, true)}
          discRefs={discRefs}
        />

        {/* the prompt to scroll: says exactly what is below, on every screen */}
        <ScrollPrompt />

      </section>

      {/* everything below the fold: the real frame, the measurements, the series */}
      <NowPlaying
        dataset={dataset}
        spec={spec}
        loading={specQuery.isLoading}
        playing={isPlaying}
        onToggle={() => void togglePlay()}
        onPick={(id) => void chooseDisc(id, true)}
        datasets={datasets}
      />

    </div>
  )
}
