import { useMemo, useState } from 'react'
import { Download, ExternalLink, Loader2, Pause, Play, Volume2 } from 'lucide-react'
import { api } from '../lib/api'
import type { Dataset } from '../lib/types'
import type { Spec, SpecCell } from '../lib/audio/phenomena'
import { Spectrum } from './Spectrum'

/** the one measured quantity each physical model is driven by */
const SIGNAL: Record<string, keyof SpecCell> = {
  wind: 'turbulence',
  storm: 'white',
  fire: 'hot',
  ocean: 'water',
  city: 'rel',
  canopy: 'green',
  plume: 'white',
  space: 'brightness',
}

/**
 * What scrolls up under the cabinet.
 *
 * The record's real NASA frame, the measurement grid drawn over it (each cell
 * sized by what it measured), the mapping the engine used, and — where NASA
 * publishes one — the frame series (night lights 2012 → 2023), analysed one
 * frame at a time. No invented imagery anywhere: every image here is a frame
 * from the SVS product credited beside it.
 */
export function NowPlaying({
  dataset,
  spec,
  loading,
  playing,
  onToggle,
  onPick,
  datasets,
}: {
  dataset: Dataset
  spec: Spec | null
  loading: boolean
  playing: boolean
  onToggle: () => void
  onPick: (id: string) => void
  datasets: Dataset[]
}) {
  const [showGrid, setShowGrid] = useState(true)
  const [seriesIndex, setSeriesIndex] = useState(0)
  const series = dataset.series ?? []
  const cells = spec?.grid.cells ?? []

  const signal = SIGNAL[spec?.model ?? dataset.model] ?? 'brightness'
  const topCells = useMemo(
    () =>
      [...cells]
        .sort(
          (a, b) =>
            (b[signal] as number) - (a[signal] as number) || b.brightness - a.brightness,
        )
        .slice(0, 4),
    [cells],
  )

  return (
    <section id="now-playing" aria-label="The record on the turntable" className="relative z-10 px-3 pb-16 pt-2 sm:px-6">
      <div className="mx-auto grid w-full max-w-[1180px] items-start gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        {/* ---------------- the frame, with the measurement grid on it --------- */}
        <div className="glass-card self-start overflow-hidden p-0">
          <div className="flex items-center justify-between gap-2 border-b border-[#d8b077]/60 px-3 py-2">
            <div className="min-w-0">
              <p className="font-display text-[9px] font-bold uppercase tracking-[0.2em] text-[#8a5a1c]">
                the frame · NASA SVS {dataset.svs_id}
              </p>
              <p className="truncate font-display text-[15px] font-semibold leading-tight text-ink">
                {dataset.title}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                onClick={() => setShowGrid((v) => !v)}
                aria-pressed={showGrid}
                className="rounded-full border border-[#c9a268] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#8a5a1c] transition hover:bg-[#fff8e8]"
              >
                {showGrid ? 'hide grid' : 'show grid'}
              </button>
              <button
                onClick={onToggle}
                aria-label={playing ? 'Pause' : 'Play'}
                className="rounded-full bg-[#3a2716] p-1.5 text-[#ffe9b8] transition hover:bg-[#5a3f22]"
              >
                {playing ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
              </button>
            </div>
          </div>

          <div className="relative bg-[#0f0c08]">
            <img
              src={api.framePngUrl(dataset.id)}
              alt={dataset.accessibility}
              className="block h-auto w-full object-contain"
            />
            {/* the measured grid: one box per cell, bright cells glow */}
            {showGrid && spec && (
              <div className="pointer-events-none absolute inset-0">
                <div
                  className="absolute inset-0 grid"
                  style={{
                    gridTemplateColumns: `repeat(${spec.grid.cols}, 1fr)`,
                    gridTemplateRows: `repeat(${spec.grid.rows}, 1fr)`,
                  }}
                >
                  {spec.grid.cells.map((c) => (
                    <div
                      key={`${c.row}-${c.col}`}
                      title={`row ${c.row + 1}, column ${c.col + 1} · brightness ${Math.round(
                        c.brightness * 99,
                      )} · texture ${Math.round(c.turbulence * 99)}`}
                      className="pointer-events-auto relative border border-[#ffe9b8]/15 transition-colors hover:border-[#ffe9b8]/80"
                      style={{ background: `rgba(255,214,130,${c.brightness * 0.26})` }}
                    >
                      <span className="absolute bottom-0.5 left-0.5 font-mono text-[7px] font-bold leading-none text-[#fff6e0] opacity-0 transition-opacity hover:opacity-100">
                        {Math.round(c.brightness * 99)}
                      </span>
                    </div>
                  ))}
                </div>
                {/* the scan axis: time runs left to right */}
                <div className="absolute inset-x-0 top-0 flex justify-between px-1 pt-0.5 font-mono text-[7.5px] font-bold uppercase tracking-[0.16em] text-[#ffe9b8]/70">
                  <span>scan →</span>
                  <span>{dataset.sensor}</span>
                </div>
              </div>
            )}
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0f0c08]/50">
                <Loader2 size={22} className="animate-spin text-[#ffd79a]" />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-[#d8b077]/60 px-3 py-2">
            <a
              href={api.framePngUrl(dataset.id)}
              download={`${dataset.id}.png`}
              className="inline-flex items-center gap-1 rounded-full border border-[#c9a268] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#8a5a1c] transition hover:bg-[#fff8e8]"
            >
              <Download size={10} /> frame
            </a>
            <a
              href={api.renderWavUrl(dataset.id)}
              download
              className="inline-flex items-center gap-1 rounded-full border border-[#c9a268] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#8a5a1c] transition hover:bg-[#fff8e8]"
            >
              <Volume2 size={10} /> the same sound, as a wav
            </a>
            <a
              href={dataset.svs_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-[#c9a268] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#8a5a1c] transition hover:bg-[#fff8e8]"
            >
              <ExternalLink size={10} /> nasa svs
            </a>
            <span className="ml-auto max-w-[46ch] text-right text-[9px] font-semibold leading-tight text-[#3a2a18a6]">
              {dataset.credit}
            </span>
          </div>
        </div>

        {/* ---------------- the analysis ---------------- */}
        <div className="flex flex-col gap-3">
          <div className="glass-card p-3">
            <p className="font-display text-[9px] font-bold uppercase tracking-[0.2em] text-[#8a5a1c]">
              how it is read
            </p>
            <p className="mt-1 text-[11.5px] font-semibold leading-snug text-[#3a2a18cc]">
              {spec?.mapping ?? 'Measuring the frame…'}
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-[#3a2a18d9]">{spec?.explain ?? dataset.description}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              <Chip label={`${spec?.layers.length ?? 0} physical layers`} />
              {spec?.drop_count ? <Chip label={`${spec.drop_count} raindrops`} /> : null}
              {spec?.crackle_count ? <Chip label={`${spec.crackle_count} crackles`} /> : null}
              <Chip label={`${dataset.year_range}`} />
            </div>
          </div>

          <div className="glass-card p-3">
            <p className="font-display text-[9px] font-bold uppercase tracking-[0.2em] text-[#8a5a1c]">
              what the grid measured
            </p>
            <div className="mt-1.5 h-16 rounded-lg border border-[#d8b077]/70 bg-[#3a2716] p-1.5">
              <Spectrum
                accent="#ffcf7d"
                label={playing ? 'live output spectrum' : 'no signal — the transport is stopped'}
              />
            </div>
            {spec ? (
              <>
                <div className="mt-2 grid grid-cols-4 gap-x-2 gap-y-1 border-t border-[#d8b077]/70 pt-2">
                  {[
                    ['brightness', spec.frame_stats.brightness],
                    ['texture', spec.frame_stats.turbulence],
                    ['saturation', spec.frame_stats.saturation],
                    ['hot px', spec.frame_stats.hot],
                    ['green', spec.frame_stats.green],
                    ['water', spec.frame_stats.water],
                    ['white', spec.frame_stats.white],
                    ['dark', spec.frame_stats.dark],
                  ].map(([k, v]) => (
                    <div key={String(k)} className="flex flex-col">
                      <span className="font-mono text-[7.5px] uppercase tracking-[0.1em] text-[#8a5a1c]">
                        {k}
                      </span>
                      <span className="font-mono text-[10px] font-bold leading-none text-[#3a2a18d9]">
                        {Number(v).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <p className="mt-2 font-display text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#8a5a1c]">
                  loudest cells · {String(signal)} <span className="normal-case">(and measured brightness)</span>
                </p>
                <ul className="mt-1 flex flex-col gap-1">
                  {topCells.map((c, i) => (
                    <li key={i} className="flex items-center gap-2 text-[10px] font-semibold text-[#3a2a18cc]">
                      <span className="w-14 shrink-0 font-mono text-[9px] text-[#8a5a1c]">
                        r{c.row + 1} c{c.col + 1}
                      </span>
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#c49a5d]/45">
                        <span
                          className="block h-full rounded-full bg-[#8a5a1c]"
                          style={{ width: `${Math.round((c[signal] as number) * 100)}%` }}
                        />
                      </span>
                      <span className="w-16 shrink-0 text-right font-mono text-[9px] leading-tight">
                        {(c[signal] as number).toFixed(2)}
                        <span className="ml-1 text-[#8a5a1c]">
                          {Math.round(c.brightness * 99)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-2 text-[10px] font-semibold text-[#3a2a18a6]">
                the engine is measuring the frame…
              </p>
            )}
          </div>

          {/* ---------------- the frame series ---------------- */}
          {series.length > 0 && (
            <div className="glass-card p-3">
              <p className="font-display text-[9px] font-bold uppercase tracking-[0.2em] text-[#8a5a1c]">
                the series · {series.length} real frames
              </p>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {series.map((s, i) => (
                  <button
                    key={s.asset}
                    onClick={() => setSeriesIndex(i)}
                    aria-pressed={seriesIndex === i}
                    className={`overflow-hidden rounded-lg border-2 transition ${
                      seriesIndex === i ? 'border-[#8a5a1c]' : 'border-transparent hover:border-[#c9a268]'
                    }`}
                  >
                    <img
                      src={api.assetUrl(dataset.id, s.asset)}
                      alt={`${dataset.title}, ${s.label}`}
                      className="block aspect-[16/9] w-full object-cover"
                    />
                    <span className="block bg-[#3a2716]/85 px-1 py-0.5 text-center text-[8px] font-bold uppercase tracking-[0.1em] text-[#ffe9b8]">
                      {s.label}
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[9.5px] font-semibold leading-snug text-[#3a2a18a6]">
                Each frame in the series is measured by the same engine, so the year-to-year change
                is audible as well as visible. Pick a frame to open it in the scanner.
              </p>
            </div>
          )}

          {/* ---------------- next records ---------------- */}
          <div className="glass-card p-3">
            <p className="font-display text-[9px] font-bold uppercase tracking-[0.2em] text-[#8a5a1c]">
              keep digging
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {datasets
                .filter((d) => d.id !== dataset.id)
                .slice(0, 6)
                .map((d) => (
                  <button
                    key={d.id}
                    onClick={() => onPick(d.id)}
                    className="rounded-full border border-[#c9a268] bg-[#fff8e8]/70 px-2 py-1 text-[9.5px] font-bold text-[#3a2a18] transition hover:bg-[#fff8e8]"
                  >
                    {d.short}
                  </button>
                ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Chip({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-[#3a2716]/85 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-[#ffe9b8]">
      {label}
    </span>
  )
}
