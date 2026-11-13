import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import {
  ArrowLeft,
  Activity,
  Download,
  ExternalLink,
  Info,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Volume2,
} from 'lucide-react'
import { api } from '../lib/api'
import { player, type ScanPayload, type ScanSnapshot, type SeriesPayload } from '../lib/audio/scanner'
import { useUI } from '../lib/store'
import type { Dataset } from '../lib/types'
import { JukeboxCabinet } from '../components/JukeboxCabinet'
import { ScanViewer } from '../components/ScanViewer'
import { BandProfile, PitchTrace, Spectrum, Waveform } from '../components/Visualizers'

function fmt(t: number) {
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Listening view: the real NASA frame, its live scan line, and the transport. */
function ListenView({
  dataset,
  scan,
  series,
  onBack,
  onPick,
  datasets,
}: {
  dataset: Dataset
  scan: ScanPayload | null
  series: SeriesPayload | null
  onBack: () => void
  onPick: (id: string) => void
  datasets: Dataset[]
}) {
  const { isPlaying, setPlaying, volume, setVolume, announce } = useUI()
  const [snap, setSnap] = useState<ScanSnapshot>(player.getSnapshot())

  useEffect(() => {
    player.onSnapshot = setSnap
    player.onEnded = () => setPlaying(false)
    return () => {
      player.onSnapshot = null
      player.onEnded = null
    }
  }, [setPlaying])

  useEffect(() => {
    player.setVolume(volume)
  }, [volume])

  const toggle = useCallback(async () => {
    if (!scan) return
    if (isPlaying) {
      player.stop()
      setPlaying(false)
      announce('Paused.')
      return
    }
    await player.init()
    player.load(scan, series)
    await player.play(snap.position > 0 && snap.position < scan.duration - 0.2 ? snap.position : 0)
    setPlaying(true)
    announce(`Scanning ${dataset.short}, north to south, ${Math.round(scan.duration)} seconds.`)
  }, [scan, series, isPlaying, snap.position, dataset, setPlaying, announce])

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

  const progress = snap.duration ? (snap.position / snap.duration) * 100 : 0

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-3 px-3 py-3 lg:grid-cols-[minmax(0,1fr)_20rem]">
      {/* left: the record */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-md border border-white/10 px-2 py-1 text-[10.5px] text-amber-100/60 transition hover:border-amber-100/40 hover:text-amber-50"
          >
            <ArrowLeft size={11} /> back to the rack
          </button>
          <span className="font-mono text-[9.5px] uppercase tracking-wider text-amber-100/30">
            {dataset.sensor} · {dataset.year_range}
          </span>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-black/60 bg-black">
          <ScanViewer dataset={dataset} />
          {/* the needle: band read-out over the image */}
          <div className="pointer-events-none absolute right-2 top-2 rounded bg-black/70 px-2 py-1 font-mono text-[9.5px] text-amber-100/80 backdrop-blur">
            {snap.bandLabel || '—'} · {snap.freq ? `${snap.freq.toFixed(0)} Hz` : 'silent'}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#0d0a07]/85 p-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => void toggle()}
              disabled={!scan}
              aria-label={isPlaying ? 'Pause scan' : `Play ${dataset.short}`}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-200 text-black transition hover:bg-amber-100 disabled:opacity-40"
            >
              {isPlaying ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" className="translate-x-0.5" />}
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="truncate text-[13px] font-semibold text-amber-50">{dataset.short}</h2>
                <span className="shrink-0 font-mono text-[10px] text-amber-100/35">
                  {fmt(snap.position)} / {fmt(snap.duration || scan?.duration || 0)}
                </span>
              </div>
              <div className="relative mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="absolute inset-y-0 left-0 rounded-full bg-amber-200" style={{ width: `${progress}%` }} />
                {scan?.tones.map((t) => (
                  <span
                    key={t.band}
                    className="absolute top-0 h-full w-px bg-black/40"
                    style={{ left: `${(t.time / (scan.duration || 1)) * 100}%` }}
                  />
                ))}
              </div>
              <p className="mt-1 font-mono text-[9px] text-amber-100/30">
                {snap.seriesLabel ? `series ${snap.seriesLabel} · ` : ''}
                band {snap.band >= 0 ? snap.band + 1 : '—'}/24 · {snap.freq ? snap.freq.toFixed(1) : '—'} Hz · amp{' '}
                {snap.amp ? snap.amp.toFixed(2) : '—'}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Volume2 size={12} className="text-amber-100/40" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                aria-label="Volume"
                className="h-1 w-14 cursor-pointer appearance-none rounded-full bg-white/15 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-200"
              />
              <button
                onClick={() => {
                  player.stop()
                  void player.play(0)
                  setPlaying(true)
                }}
                disabled={!scan}
                aria-label="Restart"
                className="rounded p-1 text-amber-100/40 hover:text-amber-50 disabled:opacity-30"
              >
                <RotateCcw size={11} />
              </button>
              <a
                href={api.renderUrl(dataset.id)}
                download
                aria-label="Download WAV"
                className="flex items-center gap-1 rounded border border-white/10 px-1.5 py-0.5 text-[9.5px] text-amber-100/55 hover:border-amber-100/40 hover:text-amber-50"
              >
                <Download size={9} /> WAV
              </a>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="h-20 rounded-lg border border-white/[0.07] bg-[#0d0a07]/70 p-1.5">
            <Spectrum accent="#fcd34d" />
          </div>
          <div className="h-20 rounded-lg border border-white/[0.07] bg-[#0d0a07]/70 p-1.5">
            <Waveform accent="#fcd34d" />
          </div>
        </div>
      </div>

      {/* right: measurements + story */}
      <div className="flex flex-col gap-2">
        <div className="rounded-xl border border-white/10 bg-[#0d0a07]/80 p-2.5">
          <h3 className="mb-1.5 flex items-center gap-1.5 text-[9px] uppercase tracking-[0.16em] text-amber-100/40">
            <Info size={10} /> The record
          </h3>
          <p className="text-[11px] leading-relaxed text-amber-50/80">{dataset.title}</p>
          <p className="mt-1.5 text-[10.5px] leading-relaxed text-amber-100/45">{dataset.description}</p>
          <dl className="mt-2 flex flex-col gap-1 border-t border-white/5 pt-2 text-[9.5px]">
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 text-amber-100/30">Credit</dt>
              <dd className="text-amber-100/55">{dataset.credit}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 text-amber-100/30">Frame</dt>
              <dd className="text-amber-100/55">{dataset.source_frame}</dd>
            </div>
          </dl>
          <a
            href={dataset.svs_url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 flex items-center gap-1 text-[9.5px] text-amber-200/70 hover:text-amber-100"
          >
            <ExternalLink size={9} /> source page
          </a>
        </div>

        {scan && (
          <div className="rounded-xl border border-white/10 bg-[#0d0a07]/80 p-2.5">
            <h3 className="mb-1.5 flex items-center gap-1.5 text-[9px] uppercase tracking-[0.16em] text-amber-100/40">
              <Activity size={10} /> 24 bands, measured
            </h3>
            <div className="h-44">
              <BandProfile bands={scan.bands} />
            </div>
            <div className="mt-1.5 h-24">
              <PitchTrace tones={scan.tones} />
            </div>
            <p className="mt-1.5 text-[9px] leading-relaxed text-amber-100/25">
              pitch {Math.min(...scan.tones.map((t) => t.freq)).toFixed(0)}–
              {Math.max(...scan.tones.map((t) => t.freq)).toFixed(0)} Hz · norm{' '}
              {scan.normalization.luminance_p2.toFixed(2)}–{scan.normalization.luminance_p98.toFixed(2)}
            </p>
          </div>
        )}

        <div className="rounded-xl border border-white/10 bg-[#0d0a07]/80 p-2.5">
          <h3 className="mb-1.5 text-[9px] uppercase tracking-[0.16em] text-amber-100/40">Other records</h3>
          <ul className="flex flex-col gap-1">
            {datasets
              .filter((d) => d.id !== dataset.id)
              .map((d) => (
                <li key={d.id}>
                  <button
                    onClick={() => onPick(d.id)}
                    className="flex w-full items-center gap-2 rounded px-1 py-1 text-left transition hover:bg-white/[0.05]"
                  >
                    <img src={api.frameUrl(d.id)} alt="" className="h-6 w-9 rounded object-cover ring-1 ring-white/10" />
                    <span className="min-w-0 flex-1 truncate text-[10px] text-amber-50/75">{d.short}</span>
                    <span className="shrink-0 font-mono text-[8.5px] text-amber-100/25">{d.sensor}</span>
                  </button>
                </li>
              ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

export function JukeboxPage() {
  const datasetsQuery = useQuery({ queryKey: ['datasets'], queryFn: api.datasets })
  const { selectedId, select, isPlaying, setPlaying, announce } = useUI()
  const [view, setView] = useState<'rack' | 'listen'>('rack')

  const datasets = datasetsQuery.data ?? []
  const dataset = datasets.find((d) => d.id === selectedId) ?? datasets[0]

  const scanQuery = useQuery({
    queryKey: ['scan', selectedId],
    queryFn: () => api.scan(selectedId),
    enabled: Boolean(selectedId),
  })
  const scan = scanQuery.data?.scan ?? null
  const series = scanQuery.data?.series ?? null

  // Preload the scan as soon as a record is chosen, so "play" is instant.
  useEffect(() => {
    if (scan) player.load(scan, series)
  }, [scan, series])

  const pick = (id: string) => {
    if (id !== selectedId) {
      player.stop()
      setPlaying(false)
      select(id)
    }
    setView('listen')
  }

  const toggleFromCabinet = async () => {
    if (!scan) {
      announce('Loading this record…')
      return
    }
    if (isPlaying) {
      player.stop()
      setPlaying(false)
      return
    }
    await player.init()
    player.load(scan, series)
    await player.play(0)
    setPlaying(true)
    announce(`Scanning ${dataset?.short ?? 'record'}.`)
  }

  if (datasetsQuery.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-amber-100/50">
        <Loader2 className="animate-spin" size={18} />
        <span className="text-sm">Warming the valves…</span>
      </div>
    )
  }

  if (datasetsQuery.isError || !dataset) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <div className="max-w-md rounded-2xl border border-red-400/30 bg-red-500/5 p-6 text-center">
          <h2 className="text-sm font-semibold text-red-300">The jukebox is unplugged</h2>
          <p className="mt-2 text-[11px] text-white/50">Start the engine, then reload:</p>
          <code className="mt-2 block rounded bg-black/50 p-3 text-left text-[11px] text-emerald-300">
            cd backend && uvicorn app.main:app --port 8000
          </code>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      {view === 'rack' ? (
        <>
          <JukeboxCabinet
            datasets={datasets}
            activeId={selectedId}
            onPick={pick}
            playing={isPlaying}
            onPlayToggle={() => void toggleFromCabinet()}
          />
          <p className="mx-auto max-w-3xl px-4 pb-8 text-center text-[10px] leading-relaxed text-amber-100/30">
            Choose a record to hear a storm, the wind, a fire, an ocean or a city at night. Each
            record is one real NASA frame; the needle reads it row by row, and every tone you hear is
            a measured pixel value.
          </p>
        </>
      ) : (
        <ListenView
          dataset={dataset}
          scan={scan}
          series={series}
          datasets={datasets}
          onBack={() => setView('rack')}
          onPick={pick}
        />
      )}
    </div>
  )
}
