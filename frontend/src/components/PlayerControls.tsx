import { useCallback, useEffect, useRef } from 'react'
import {
  Download,
  Gauge,
  Pause,
  Play,
  Repeat,
  Sparkles,
  Volume2,
  VolumeX,
  Waves,
} from 'lucide-react'
import { engine } from '../lib/audio/engine'
import { useUI } from '../lib/store'
import { api } from '../lib/api'
import { NOTE_NAMES, SCALES } from '../lib/audio/scales'
import type { Dataset, SonParams } from '../lib/types'

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
  icon,
  accent,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  display: string
  icon?: React.ReactNode
  accent: string
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <label className="group flex flex-col gap-1.5">
      <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.14em] text-white/45">
        <span className="flex items-center gap-1.5">
          {icon}
          {label}
        </span>
        <span className="font-mono text-[10px] text-white/70">{display}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full outline-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-black/40 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white"
        style={{
          background: `linear-gradient(to right, ${accent} 0%, ${accent} ${pct}%, rgba(255,255,255,0.12) ${pct}%, rgba(255,255,255,0.12) 100%)`,
        }}
      />
    </label>
  )
}

export function PlayerControls({
  dataset,
  params,
}: {
  dataset: Dataset
  params: SonParams | null
}) {
  const {
    isPlaying,
    setPlaying,
    volume,
    setVolume,
    tempoScale,
    setTempoScale,
    densityScale,
    setDensityScale,
    brightnessScale,
    setBrightnessScale,
    reverb,
    setReverb,
    rootOverride,
    setRootOverride,
    scaleOverride,
    setScaleOverride,
    announce,
  } = useUI()
  const busy = useRef(false)
  const accent = dataset.palette[0]

  const togglePlay = useCallback(async () => {
    if (busy.current) return
    busy.current = true
    try {
      if (!params) {
        announce('Still analysing this frame — one moment.')
        return
      }
      if (!isPlaying) {
        await engine.init()
        engine.setLive({ volume, tempoScale, densityScale, brightnessScale, reverb })
        engine.start()
        setPlaying(true)
        announce(`Playing ${dataset.short}. ${params ? `Root ${params.root_note} ${params.scale_name}, ${params.tempo} beats per minute.` : ''}`)
      } else {
        engine.stop()
        setPlaying(false)
        announce(`Paused ${dataset.short}.`)
      }
    } finally {
      busy.current = false
    }
  }, [isPlaying, volume, tempoScale, densityScale, brightnessScale, reverb, dataset, params, setPlaying, announce])

  // spacebar = play/pause (unless focus is in a control)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (e.code === 'Space' && !['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT'].includes(el.tagName)) {
        e.preventDefault()
        void togglePlay()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [togglePlay])

  useEffect(() => {
    engine.setLive({ volume, tempoScale, densityScale, brightnessScale, reverb })
  }, [volume, tempoScale, densityScale, brightnessScale, reverb])

  useEffect(() => {
    engine.setRoot(rootOverride)
    engine.setScale(scaleOverride)
  }, [rootOverride, scaleOverride])

  const scaleName = scaleOverride ? SCALES[scaleOverride]?.name : params?.scale_name

  return (
    <div className="pointer-events-auto w-full rounded-2xl border border-white/10 bg-[#080b16]/85 p-4 shadow-2xl backdrop-blur-xl">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => void togglePlay()}
          aria-label={isPlaying ? 'Pause sonification' : `Play ${dataset.short}`}
          className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-black shadow-xl transition hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          style={{ background: `linear-gradient(135deg, ${accent}, ${dataset.palette[1]})` }}
        >
          {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" className="translate-x-0.5" />}
          {isPlaying && (
            <span
              className="absolute inset-0 animate-ping rounded-full opacity-30"
              style={{ background: accent }}
            />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-semibold text-white">{dataset.short}</h2>
            <span className="rounded-full border border-white/15 px-2 py-0.5 text-[9px] uppercase tracking-wider text-white/50">
              {dataset.year_range}
            </span>
          </div>
          <p className="mt-0.5 truncate text-[11px] text-white/45">
            {dataset.instrument_name} · {scaleName} · {params ? `${Math.round(params.tempo * tempoScale)} BPM` : '—'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={api.renderUrl(dataset.id)}
            download
            className="flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 text-[11px] text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            aria-label={`Download the rendered WAV of ${dataset.short}`}
          >
            <Download size={13} />
            <span className="hidden sm:inline">WAV</span>
          </a>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
        <Slider
          label="Tempo"
          value={tempoScale}
          min={0.5}
          max={1.8}
          step={0.01}
          onChange={setTempoScale}
          display={`${Math.round((params?.tempo ?? 80) * tempoScale)}`}
          icon={<Gauge size={10} />}
          accent={accent}
        />
        <Slider
          label="Density"
          value={densityScale}
          min={0.2}
          max={1.8}
          step={0.01}
          onChange={setDensityScale}
          display={`${Math.round(densityScale * 100)}%`}
          icon={<Repeat size={10} />}
          accent={accent}
        />
        <Slider
          label="Brightness"
          value={brightnessScale}
          min={0.2}
          max={1.8}
          step={0.01}
          onChange={setBrightnessScale}
          display={`${Math.round(brightnessScale * 100)}%`}
          icon={<Sparkles size={10} />}
          accent={accent}
        />
        <Slider
          label="Reverb"
          value={reverb}
          min={0}
          max={1}
          step={0.01}
          onChange={setReverb}
          display={`${Math.round(reverb * 100)}%`}
          icon={<Waves size={10} />}
          accent={accent}
        />
        <Slider
          label="Volume"
          value={volume}
          min={0}
          max={1}
          step={0.01}
          onChange={setVolume}
          display={`${Math.round(volume * 100)}%`}
          icon={volume === 0 ? <VolumeX size={10} /> : <Volume2 size={10} />}
          accent={accent}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/5 pt-3">
        <span className="text-[10px] uppercase tracking-[0.14em] text-white/40">Root</span>
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setRootOverride(null)}
            className={`rounded px-1.5 py-0.5 text-[10px] transition ${
              rootOverride === null ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/80'
            }`}
            aria-pressed={rootOverride === null}
          >
            auto
          </button>
          {NOTE_NAMES.map((n) => (
            <button
              key={n}
              onClick={() => setRootOverride(n)}
              className={`rounded px-1.5 py-0.5 font-mono text-[10px] transition ${
                rootOverride === n ? 'text-black' : 'text-white/45 hover:text-white/90'
              }`}
              style={rootOverride === n ? { background: accent } : undefined}
              aria-pressed={rootOverride === n}
            >
              {n}
            </button>
          ))}
        </div>
        <span className="ml-2 text-[10px] uppercase tracking-[0.14em] text-white/40">Scale</span>
        <select
          value={scaleOverride ?? 'auto'}
          onChange={(e) => setScaleOverride(e.target.value === 'auto' ? null : e.target.value)}
          className="rounded border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/80 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          aria-label="Musical scale"
        >
          <option value="auto" className="bg-[#0b1020]">
            auto ({params?.scale_name ?? '—'})
          </option>
          {Object.entries(SCALES).map(([k, v]) => (
            <option key={k} value={k} className="bg-[#0b1020]">
              {v.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
