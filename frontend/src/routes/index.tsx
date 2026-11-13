import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Activity, Layers, Loader2, Radar, Sparkles, Waves } from 'lucide-react'
import { api } from '../lib/api'
import { engine } from '../lib/audio/engine'
import { useUI } from '../lib/store'
import type { Dataset } from '../lib/types'
import { Jukebox3D } from '../components/Jukebox3D'
import { TrackLibrary } from '../components/TrackLibrary'
import { PlayerControls } from '../components/PlayerControls'
import { FeaturePanel } from '../components/FeaturePanel'
import { FrameViewer } from '../components/FrameViewer'
import {
  FeatureRadar,
  Histogram,
  NoteWaterfall,
  Polar,
  SpatialGrid,
  Spectrum,
  Waveform,
} from '../components/Visualizers'

function VisualizerCard({
  title,
  hint,
  icon,
  children,
  className = '',
}: {
  title: string
  hint?: string
  icon: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#080b16]/70 backdrop-blur-md ${className}`}
    >
      <div className="flex items-center justify-between px-2.5 py-1.5">
        <span className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/40">
          {icon}
          {title}
        </span>
        {hint && <span className="font-mono text-[9px] text-white/25">{hint}</span>}
      </div>
      <div className="relative min-h-0 flex-1 px-1.5 pb-1.5">{children}</div>
    </div>
  )
}

export function JukeboxPage() {
  const datasetsQuery = useQuery({ queryKey: ['datasets'], queryFn: api.datasets })
  const selectedId = useUI((s) => s.selectedId)
  const isPlaying = useUI((s) => s.isPlaying)
  const announce = useUI((s) => s.announce)

  const analysisQuery = useQuery({
    queryKey: ['analysis', selectedId],
    queryFn: () => api.analysis(selectedId),
    enabled: Boolean(selectedId),
  })

  const datasets = datasetsQuery.data ?? []
  const dataset: Dataset | undefined =
    analysisQuery.data?.dataset ?? datasets.find((d) => d.id === selectedId)
  const accent = dataset?.palette?.[0] ?? '#22d3ee'

  useEffect(() => {
    if (analysisQuery.data) {
      engine.setParams(analysisQuery.data.params, selectedId)
    }
  }, [analysisQuery.data, selectedId])

  // Keyboard track navigation: ← / → step through the jukebox.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      if (!datasets.length) return
      e.preventDefault()
      const idx = datasets.findIndex((d) => d.id === selectedId)
      const next = (idx + (e.key === 'ArrowRight' ? 1 : datasets.length - 1)) % datasets.length
      useUI.getState().select(datasets[next].id)
      useUI.getState().announce(`Loaded ${datasets[next].short}. ${datasets[next].accessibility}`)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [datasets, selectedId])

  useEffect(() => {
    if (dataset && !isPlaying) {
      announce(`${dataset.short}: ${dataset.description}`)
    }
    // announce only when dataset changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataset?.id])

  if (datasetsQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center gap-3 text-white/50">
        <Loader2 className="animate-spin" size={18} />
        <span className="text-sm">Tuning the jukebox…</span>
      </div>
    )
  }

  if (datasetsQuery.isError) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="max-w-md rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-center">
          <h2 className="text-sm font-semibold text-red-300">Cannot reach the sonification engine</h2>
          <p className="mt-2 text-xs leading-relaxed text-white/50">
            Start the Python backend, then reload:
          </p>
          <code className="mt-3 block rounded-lg bg-black/50 p-3 text-left text-[11px] text-emerald-300">
            cd backend
            <br />
            uvicorn app.main:app --port 8000
          </code>
        </div>
      </div>
    )
  }

  const features = analysisQuery.data?.features ?? null
  const params = analysisQuery.data?.params ?? null

  return (
    <div className="relative h-full">
      <Jukebox3D datasets={datasets} />

      {/* left rail : library + frame */}
      <div className="pointer-events-none absolute left-0 top-0 z-20 flex w-full flex-col gap-3 p-3 sm:inset-y-0 sm:w-[19rem] sm:overflow-y-auto sm:pb-4">
        <div className="pointer-events-auto rounded-2xl border border-white/10 bg-[#080b16]/80 p-2.5 backdrop-blur-xl sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          <TrackLibrary datasets={datasets} />
        </div>
        <div className="pointer-events-auto hidden sm:block">
          {dataset && (
            <FrameViewer
              id={dataset.id}
              short={dataset.short}
              features={features}
              accent={accent}
            />
          )}
        </div>
      </div>

      {/* right rail : mapping + visualizers */}
      <div className="pointer-events-none absolute inset-y-0 right-0 z-20 hidden w-[21rem] flex-col gap-3 overflow-y-auto p-3 pb-4 lg:flex">
        {dataset && params && features && (
          <div className="pointer-events-auto">
            <FeaturePanel
              features={features}
              params={params}
              mapping={dataset.mapping}
              accent={accent}
            />
          </div>
        )}
        <div className="pointer-events-auto grid grid-cols-2 gap-2">
          <VisualizerCard title="Spectrum" icon={<Activity size={10} />} className="h-28">
            <Spectrum accent={accent} />
          </VisualizerCard>
          <VisualizerCard title="Waveform" icon={<Waves size={10} />} className="h-28">
            <Waveform accent={accent} />
          </VisualizerCard>
          <VisualizerCard title="Polar field" icon={<Radar size={10} />} className="h-28">
            <Polar accent={accent} />
          </VisualizerCard>
          <VisualizerCard title="Note field" icon={<Sparkles size={10} />} className="h-28">
            <NoteWaterfall accent={accent} />
          </VisualizerCard>
          {features && (
            <>
              <VisualizerCard title="Luminance" icon={<Layers size={10} />} className="h-24">
                <Histogram
                  values={features.luminance_histogram}
                  accent={accent}
                  label=""
                />
              </VisualizerCard>
              <VisualizerCard title="Hue peaks" icon={<Layers size={10} />} className="h-24">
                <Histogram values={features.hue_histogram} accent={dataset?.palette[1] ?? accent} label="" />
              </VisualizerCard>
            </>
          )}
        </div>
        {features && (
          <div className="pointer-events-auto grid grid-cols-2 gap-2">
            <VisualizerCard title="Spatial grid" icon={<Layers size={10} />} className="h-32">
              <SpatialGrid features={features} accent={accent} />
            </VisualizerCard>
            <VisualizerCard title="Feature radar" icon={<Radar size={10} />} className="h-32">
              <FeatureRadar features={features} accent={accent} />
            </VisualizerCard>
          </div>
        )}
      </div>

      {/* bottom deck */}
      <div className="absolute inset-x-0 bottom-0 z-30 px-3 pb-3 lg:left-[19rem] lg:right-[21rem]">
        <div className="pointer-events-auto mx-auto max-w-3xl">
          {dataset && <PlayerControls dataset={dataset} params={params} />}
          <p className="mt-1.5 text-center text-[9px] uppercase tracking-[0.2em] text-white/20">
            Space play · ← → tracks · drag to orbit · click a disc
          </p>
        </div>
      </div>

      {/* mobile visualizer strip */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[15.5rem] z-20 flex justify-center px-3 lg:hidden">
        <div className="pointer-events-auto flex w-full max-w-sm gap-2">
          <VisualizerCard title="Spectrum" icon={<Activity size={10} />} className="h-16 flex-1">
            <Spectrum accent={accent} />
          </VisualizerCard>
          <VisualizerCard title="Notes" icon={<Sparkles size={10} />} className="h-16 flex-1">
            <NoteWaterfall accent={accent} />
          </VisualizerCard>
        </div>
      </div>

    </div>
  )
}
