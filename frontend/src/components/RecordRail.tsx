import { useEffect, useRef } from 'react'
import { api } from '../lib/api'
import type { Dataset } from '../lib/types'
import { VinylDisc } from './VinylDisc'

/**
 * The record rail.
 *
 * A shelf of all thirteen discs pinned to the bottom edge of the stage, so a
 * record can be changed without opening the crate or scrolling: the current
 * disc is lit and pulled forward, the rest sit back in shadow. Picking one sends
 * it flying into the cabinetry exactly as the crate does — same flight, same
 * needle drop, same measurement — it is only a faster way in.
 */
export function RecordRail({
  datasets,
  selectedId,
  playing,
  powered,
  onPick,
  discRefs,
}: {
  datasets: Dataset[]
  selectedId: string
  playing: boolean
  powered: boolean
  onPick: (id: string) => void
  discRefs: React.RefObject<Record<string, HTMLElement | null>>
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)

  // keep the current record in view when it changes from elsewhere
  useEffect(() => {
    const el = activeRef.current
    const track = trackRef.current
    if (!el || !track) return
    const target = el.offsetLeft - track.clientWidth / 2 + el.clientWidth / 2
    track.scrollTo({ left: Math.max(0, target), behavior: 'smooth' })
  }, [selectedId])

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center px-2 pb-1.5">
      <div className="pointer-events-auto flex w-full max-w-[min(96vw,860px)] flex-col gap-1 rounded-2xl border border-[#ffe9b83d] bg-[#120e08c9] px-2 py-1.5 shadow-[0_-6px_28px_-10px_rgba(0,0,0,.95)] backdrop-blur-md">
        <div className="flex items-center justify-between gap-2 px-0.5">
          <span className="font-display text-[7.5px] font-bold uppercase tracking-[0.18em] text-[#ffd79a]">
            the rail · 13 records
          </span>
          <span className="truncate font-display text-[7.5px] font-bold uppercase tracking-[0.14em] text-[#ffe9b8a6]">
            {playing ? 'needle down' : powered ? 'pick a disc' : 'cabinet off'}
          </span>
        </div>

        <div
          ref={trackRef}
          className="rail-track flex snap-x items-end gap-1.5 overflow-x-auto pb-0.5"
          aria-label="Change record"
        >
          {datasets.map((d, i) => {
            const active = d.id === selectedId
            return (
              <button
                key={d.id}
                ref={active ? activeRef : undefined}
                aria-pressed={active}
                aria-label={`Play record ${i + 1}: ${d.short}`}
                title={d.short}
                onClick={() => onPick(d.id)}
                className={`group relative flex min-w-[44px] flex-1 shrink-0 snap-center flex-col items-center gap-0.5 rounded-lg px-0.5 pb-1 pt-1 transition ${
                  active ? 'bg-[#ffe9b8]/22 ring-1 ring-[#ffe9b8]/70' : 'hover:bg-white/10'
                }`}
              >
                <span
                  ref={(el) => {
                    discRefs.current[d.id] = el
                  }}
                  className="block transition-transform duration-300 group-hover:-translate-y-1"
                  style={{ opacity: active ? 1 : 0.74, filter: active ? 'none' : 'saturate(.8)' }}
                >
                  <VinylDisc
                    id={d.id}
                    size={40}
                    spinning={active && playing}
                    labelUrl={api.frameUrl(d.id)}
                    title={d.short}
                    style={{ filter: 'drop-shadow(0 3px 5px rgba(0,0,0,.7))' }}
                  />
                </span>
                <span
                  className={`w-full truncate text-center text-[7.5px] font-bold uppercase leading-none tracking-[0.02em] ${
                    active ? 'text-[#fff3d4]' : 'text-[#ffe9b8a6]'
                  }`}
                >
                  {d.short}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
