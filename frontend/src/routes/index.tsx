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
import { RecordRail } from '../components/RecordRail'
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
 * until you scroll. This is offered twice — as a compact chip in the header
 * column on phones, and as a floating pill in the free right margin on wider
 * screens — so it never lands on the cabinet's own controls. It retires itself
 * as soon as you scroll.
 */
function useScrolledPast(px: number) {
  const [past, setPast] = useState(false)
  useEffect(() => {
    const onScroll = () => setPast(window.scrollY > px)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [px])
  return past
}

function ScrollPrompt({ compact = false }: { compact?: boolean }) {
  const gone = useScrolledPast(80)

  return (
    <a
      href="#now-playing"
      onClick={(e) => {
        e.preventDefault()
        document.getElementById('now-playing')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }}
      aria-label="Scroll down for the frame, the measurements and the frame-by-frame analysis"
      className={`scroll-hint pointer-events-auto flex w-fit max-w-full items-center gap-2 rounded-full border border-[#ffe9b8]/60 bg-[#120e08d9] text-[#ffe9b8] shadow-[0_10px_24px_-10px_rgba(0,0,0,.95)] backdrop-blur-sm transition-all duration-300 hover:bg-[#120e08] ${
        compact ? 'px-2.5 py-1.5' : 'px-4 py-2'
      } ${gone ? 'pointer-events-none translate-y-2 opacity-0' : 'opacity-100'}`}
    >
      <span className="flex flex-col text-left">
        <span className="font-display text-[8.5px] font-bold uppercase leading-tight tracking-[0.16em] text-[#ffd79a]">
          scroll for more
        </span>
        <span className="text-[9.5px] font-semibold leading-tight text-[#ffe9b8d9]">
          {compact ? 'the frame · the analysis' : 'the frame · 72 measured cells · every frame in the series'}
        </span>
      </span>
      <ChevronDown size={compact ? 13 : 16} className="shrink-0 animate-bounce text-[#ffd79a]" />
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
        className="stage-full relative flex w-full items-end justify-center overflow-hidden pb-[104px] pt-1 sm:pb-[92px]"
      >
        {/*
          No page title here: the wordmark in the header already carries the
          name, so the stage keeps only the live status of the scene and, before
          the switch is thrown, the one instruction that matters.
        */}
        <div className="pointer-events-none absolute left-3 top-3 z-30 flex max-w-[min(52vw,300px)] flex-col items-start gap-1.5 sm:left-5 sm:top-4">
          <h1 className="sr-only">The Earth Information Jukebox</h1>
          <p className="inline-flex items-center gap-1.5 rounded-full border border-[#ffd79a59] bg-[#120e08b3] px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[0.13em] text-[#ffe9b8] backdrop-blur-sm">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                !started ? 'animate-pulse bg-[#ffd47a]' : isPlaying ? 'bg-[#ffb454]' : 'bg-[#8a9a7a]'
              }`}
            />
            {!started ? 'the switch is on the cabinet' : `${scene.label} · ${scene.weather}`}
          </p>
          <div className="sm:hidden">
            <ScrollPrompt compact />
          </div>
        </div>

        <div className="relative z-10" style={{ width: 'min(94vw, 800px, calc((100svh - 150px) * 0.854))' }}>
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

        {/* the rail: every record reachable from the bottom edge of the stage */}
        <RecordRail
          datasets={datasets}
          selectedId={selectedId}
          playing={isPlaying}
          powered={powered}
          onPick={(id) => void chooseDisc(id, true)}
          discRefs={discRefs}
        />

        {/* the prompt to scroll, in the free right margin where nothing sits */}
        <div className="absolute bottom-[104px] right-4 z-30 hidden sm:block">
          <ScrollPrompt />
        </div>

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
