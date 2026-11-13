import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { api } from '../lib/api'
import type { Dataset } from '../lib/types'
import { VinylDisc } from './VinylDisc'

/**
 * The disc selector.
 *
 * Collapsed, it is a single record: the one in the cradle, spinning when the
 * needle is down, with its NASA frame printed on the label. Click it and the
 * crate fans out around it — real discs, each carrying its own frame — and
 * picking one sends it flying into the cabinet and onto the turntable.
 */
export function DiscSelector({
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
  const [open, setOpen] = useState(false)
  // once you scroll down to the frame and the analysis, the crate steps aside
  const [scrolled, setScrolled] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const selected = datasets.find((d) => d.id === selectedId) ?? datasets[0]

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 140)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div
      className={`pointer-events-none absolute right-2 top-1 z-30 flex justify-end transition-all duration-300 md:inset-auto md:bottom-[6%] md:left-[max(14px,calc((100vw-100%)/2-360px))] md:block ${
        scrolled && !open ? 'pointer-events-none opacity-0 md:translate-y-3' : 'opacity-100'
      }`}
    >
      <div className="pointer-events-auto relative">
        {/* the fan of records */}
        {open &&
          createPortal(
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-3">
              <div
                className="absolute inset-0 bg-[#0b0906]/35"
                onClick={() => setOpen(false)}
                aria-hidden
              />
              <div
                ref={panelRef}
                role="dialog"
                aria-label="Choose a record"
                aria-modal="true"
                className="dark-card relative w-[min(94vw,540px)] p-2.5 shadow-[0_40px_90px_-30px_rgba(0,0,0,.95)]"
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-[#ffd79a]">
                    the crate · {datasets.length} records
                  </p>
                  <button
                    onClick={() => setOpen(false)}
                    aria-label="Close the crate"
                    className="rounded-full border border-[#ffe9b8]/35 p-1 text-[#ffe9b8] transition hover:bg-white/10"
                  >
                    <X size={12} />
                  </button>
                </div>
                <ul className="grid grid-cols-4 gap-1 sm:grid-cols-5">
                  {datasets.map((d, i) => {
                    const active = d.id === selectedId
                    return (
                      <li key={d.id}>
                        <button
                          onClick={() => {
                            onPick(d.id)
                            setOpen(false)
                          }}
                          aria-pressed={active}
                          aria-label={`Play record ${i + 1}: ${d.short}`}
                          className={`rack-slot flex w-full flex-col items-center gap-1 rounded-xl p-1 text-center transition ${
                            active ? 'bg-[#ffe9b8]/25 ring-1 ring-[#ffe9b8]/70' : 'hover:bg-white/10'
                          }`}
                        >
                          <span
                            ref={(el) => {
                              discRefs.current[d.id] = el
                            }}
                            className="block"
                          >
                            <VinylDisc
                              id={d.id}
                              size={56}
                              labelUrl={api.frameUrl(d.id)}
                              title={d.short}
                              style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,.7))' }}
                            />
                          </span>
                          <span className="line-clamp-2 font-display text-[9px] font-bold leading-tight text-[#fff3d4]">
                            {d.short}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>,
            document.body,
          )}

        {/* the button itself: one record, sized like a 12-inch single */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? 'Close the crate' : `Choose a record — now playing ${selected?.short ?? ''}`}
          className="group relative block rounded-full outline-offset-4 transition-transform duration-200 hover:scale-[1.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffe9b8] active:scale-95"
        >
          <span
            className="absolute -inset-3 rounded-full opacity-70 blur-xl transition-opacity duration-500 group-hover:opacity-100"
            style={{
              background: powered
                ? 'radial-gradient(circle, rgba(255,196,110,.55), transparent 70%)'
                : 'radial-gradient(circle, rgba(120,140,160,.3), transparent 70%)',
            }}
          />
          {selected && (
            <VinylDisc
              id={selected.id}
              size={96}
              spinning={playing}
              labelUrl={api.frameUrl(selected.id)}
              title={selected.short}
              style={{ filter: 'drop-shadow(0 8px 16px rgba(0,0,0,.75))' }}
            />
          )}
          {!open && (
            <span className="pointer-events-none absolute left-1/2 top-[calc(100%+8px)] -translate-x-1/2 whitespace-nowrap md:-top-2 md:top-auto md:-translate-y-full rounded-full border border-[#ffe9b84d] bg-[#120e08]/92 px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.14em] text-[#ffe9b8] shadow-lg">
              the crate
            </span>
          )}
        </button>
      </div>
    </div>
  )
}
