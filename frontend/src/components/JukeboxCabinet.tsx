import { useEffect, useMemo, useRef, useState } from 'react'
import type { Dataset } from '../lib/types'
import { ELEMENT_META } from '../lib/types'

/**
 * The start screen: a 1950s-style jukebox cabinet. Wood frame, chrome trim,
 * glowing arch, and a carousel of real NASA "records". Click a record (or a
 * letter/number key) and the disc lifts out of the stack, slides into the
 * deck, spins up, and the cabinet flips to the listening view.
 *
 * Everything visible here is either CSS chrome or one of the real NASA frames,
 * used as the record label.
 */

const ELEMENT_COLOR: Record<string, string> = {
  storms: '#7dd3fc',
  wind: '#86efac',
  fire: '#fca5a5',
  ocean: '#67e8f9',
  land: '#fcd34d',
  space: '#c4b5fd',
}

export function JukeboxCabinet({
  datasets,
  onPick,
  activeId,
  playing,
  onPlayToggle,
}: {
  datasets: Dataset[]
  onPick: (id: string) => void
  activeId: string
  playing: boolean
  onPlayToggle: () => void
}) {
  // Records laid out in a fan, like a rack of singles.
  const [hovered, setHovered] = useState<string | null>(null)
  const [inserting, setInserting] = useState<string | null>(null)
  const deckRef = useRef<HTMLDivElement>(null)
  const n = datasets.length
  const active = datasets.find((d) => d.id === activeId) ?? datasets[0]

  // Escape closes the fan / returns to rack.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setInserting(null)
      const num = Number(e.key)
      if (Number.isInteger(num) && num >= 1 && num <= n) {
        const target = datasets[num - 1]
        if (target) {
          setInserting(target.id)
          window.setTimeout(() => onPick(target.id), 620)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [datasets, n, onPick])

  const fan = useMemo(
    () =>
      datasets.map((d, i) => {
        const t = n > 1 ? i / (n - 1) : 0.5
        const angle = -26 + t * 52
        return { d, i, angle, t }
      }),
    [datasets, n],
  )

  const pick = (id: string) => {
    setInserting(id)
    window.setTimeout(() => onPick(id), 620)
  }

  const spin = playing ? 'animation: spin-disk 3.2s linear infinite' : ''

  return (
    <section
      className="relative mx-auto flex w-full max-w-6xl flex-col items-center px-3 pb-8 pt-6"
      aria-label="Cartridge jukebox — choose a record"
    >
      <style>{`
        @keyframes spin-disk { to { transform: rotate(360deg) } }
        @keyframes glow-pulse { 0%,100% { opacity:.55 } 50% { opacity:1 } }
        @keyframes chrome-sweep { 0% { background-position:-200% 0 } 100% { background-position:200% 0 } }
        .chrome {
          background: linear-gradient(100deg,#3a4453 0%,#8f9cab 18%,#eef4fa 34%,#8d99a8 52%,#4a5462 70%,#cfd8e3 88%,#59626f 100%);
          background-size: 200% 100%;
          animation: chrome-sweep 7s linear infinite;
        }
        .wood {
          background:
            repeating-linear-gradient(96deg, rgba(255,255,255,.045) 0 2px, transparent 2px 7px),
            linear-gradient(175deg,#5a2f1b 0%,#43210f 40%,#2c1509 100%);
        }
        .arch-glow { animation: glow-pulse 3.6s ease-in-out infinite }
      `}</style>

      {/* ---------- cabinet ---------- */}
      <div className="relative w-full overflow-hidden rounded-[2rem] border border-black/60 shadow-[0_30px_80px_-20px_rgba(0,0,0,.9)]">
        <div className="wood absolute inset-0" />
        <div className="relative p-3 sm:p-5">
          {/* arch: the glowing canopy */}
          <div className="relative overflow-hidden rounded-t-[1.6rem] rounded-b-xl border border-amber-200/20 bg-[#120a06] p-3 sm:p-4">
            <div
              aria-hidden
              className="arch-glow pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(120% 90% at 50% 0%, rgba(255,196,92,.55) 0%, rgba(255,120,60,.22) 38%, transparent 68%)',
              }}
            />
            <div className="relative flex flex-col items-center gap-1">
              <p className="text-[9px] uppercase tracking-[0.42em] text-amber-200/80">NASA · Earth Information</p>
              <h1
                className="text-center text-2xl font-semibold tracking-[0.14em] text-amber-50 sm:text-4xl"
                style={{ textShadow: '0 0 22px rgba(255,190,90,.55), 0 2px 0 rgba(0,0,0,.6)' }}
              >
                TERRA&nbsp;JUKEBOX
              </h1>
              <p className="text-[9.5px] uppercase tracking-[0.28em] text-amber-200/55">
                13 records · sonified from NASA imagery
              </p>
            </div>
          </div>

          {/* chrome band */}
          <div className="chrome mt-2 h-1.5 rounded-full opacity-80" />

          {/* ---------- record rack + deck ---------- */}
          <div className="mt-3 grid gap-3 lg:grid-cols-[1.15fr_1fr]">
            {/* rack */}
            <div className="relative min-h-[16rem] overflow-hidden rounded-xl border border-black/50 bg-[#0c0805] p-3 sm:min-h-[19rem]">
              <p className="mb-2 text-[9px] uppercase tracking-[0.24em] text-amber-200/45">The rack</p>
              <div className="relative flex h-[13rem] items-end justify-center sm:h-[15rem]">
                {fan.map(({ d, i, angle }) => {
                  const isActive = d.id === activeId
                  const isHover = hovered === d.id
                  const lifted = isHover || isActive
                  return (
                    <button
                      key={d.id}
                      onClick={() => pick(d.id)}
                      onMouseEnter={() => setHovered(d.id)}
                      onMouseLeave={() => setHovered(null)}
                      onFocus={() => setHovered(d.id)}
                      onBlur={() => setHovered(null)}
                      aria-label={`Load ${d.short} — ${d.sensor}. ${d.description}`}
                      className="group absolute bottom-0 origin-bottom transition-all duration-300 ease-out focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-200"
                      style={{
                        left: `calc(50% - 3.4rem + ${(i - (n - 1) / 2) * 2.55}rem)`,
                        transform: `rotate(${angle}deg) translateY(${lifted ? -14 : 0}px) scale(${lifted ? 1.06 : 1})`,
                        zIndex: lifted ? 30 : 10 + i,
                      }}
                    >
                      {/* record sleeve */}
                      <span className="relative block h-[9.2rem] w-[6.8rem] overflow-hidden rounded-[3px] border border-black/70 shadow-[0_10px_18px_-8px_rgba(0,0,0,.95)]">
                        <img
                          src={`/api/datasets/${d.id}/frame.png`}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent px-1.5 pb-1 pt-4">
                          <span className="block truncate text-[8.5px] font-semibold uppercase tracking-wider text-white/95">
                            {d.short}
                          </span>
                          <span className="block truncate text-[7px] text-white/55">{d.sensor}</span>
                        </span>
                        {/* vinyl peeking out of the sleeve */}
                        <span
                          aria-hidden
                          className="absolute -right-2 top-3 h-10 w-10 rounded-full border border-white/25"
                          style={{
                            background:
                              'repeating-radial-gradient(circle at 50% 50%, #111 0 2px, #1d1d1d 2px 3px)',
                          }}
                        />
                        <span
                          aria-hidden
                          className="absolute -right-1 top-5 h-6 w-6 rounded-full"
                          style={{ background: ELEMENT_COLOR[d.element] ?? '#888', opacity: 0.85 }}
                        />
                      </span>
                      <span className="mt-1 block text-center text-[8px] font-mono text-amber-200/40">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                    </button>
                  )
                })}
              </div>
              <p className="mt-2 text-center text-[9px] text-amber-200/30">
                click a record · or press its number
              </p>
            </div>

            {/* deck */}
            <div
              ref={deckRef}
              className="relative flex min-h-[16rem] flex-col justify-between overflow-hidden rounded-xl border border-black/50 bg-gradient-to-b from-[#14100c] to-[#0a0705] p-3 sm:min-h-[19rem]"
            >
              <div className="flex items-center justify-between">
                <p className="text-[9px] uppercase tracking-[0.24em] text-amber-200/45">Now on the deck</p>
                <span className="font-mono text-[9px] text-amber-200/35">SIDE A · 24 bands</span>
              </div>

              {/* turntable */}
              <div className="relative mx-auto my-2 flex h-[9rem] w-[9rem] items-center justify-center sm:h-[10.5rem] sm:w-[10.5rem]">
                <div className="absolute inset-0 rounded-full border border-white/10 bg-[#0b0b0d] shadow-[inset_0_0_40px_rgba(0,0,0,.9)]" />
                <div
                  className="absolute inset-[6px] rounded-full"
                  style={{
                    background:
                      'repeating-radial-gradient(circle at 50% 50%, #0e0e10 0 2px, #17171a 2px 3px, #0d0d0f 3px 5px)',
                    ...(inserting === activeId ? { animation: 'spin-disk 1.1s linear infinite' } : null),
                    ...(inserting !== activeId ? { animation: spin } : null),
                  }}
                />
                {/* label = the real NASA frame */}
                <div
                  className="relative z-10 h-[5.4rem] w-[5.4rem] overflow-hidden rounded-full border-2 border-black/70 shadow-lg"
                  style={{ animation: inserting === activeId ? 'spin-disk 1.1s linear infinite' : spin }}
                >
                  <img
                    src={`/api/datasets/${active.id}/frame.png`}
                    alt={`Record label: ${active.title}`}
                    className="h-full w-full object-cover opacity-90"
                  />
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="h-2 w-2 rounded-full bg-black/80 ring-2 ring-white/20" />
                  </span>
                </div>
                {/* tone arm */}
                <div
                  aria-hidden
                  className="absolute right-[-6px] top-2 h-[7rem] w-[3px] origin-top rounded-full bg-gradient-to-b from-slate-200 to-slate-500 transition-transform duration-700"
                  style={{ transform: `rotate(${playing ? 24 : 6}deg)` }}
                >
                  <span className="absolute -bottom-1 -left-1 h-2.5 w-2.5 rounded-sm bg-slate-300" />
                </div>
              </div>

              <div>
                <p className="truncate text-[13px] font-semibold text-amber-50">{active.short}</p>
                <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-amber-100/45">
                  {active.accessibility}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={onPlayToggle}
                    className="flex items-center gap-1.5 rounded-full border border-amber-200/40 bg-amber-200/10 px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-amber-100 transition hover:bg-amber-200/20"
                  >
                    {playing ? 'Pause scan' : 'Play this record'}
                  </button>
                  <span
                    className="rounded-full px-2 py-0.5 text-[9px] font-mono uppercase"
                    style={{
                      background: `${ELEMENT_COLOR[active.element] ?? '#888'}22`,
                      color: ELEMENT_COLOR[active.element] ?? '#aaa',
                    }}
                  >
                    {ELEMENT_META[active.element]?.label ?? active.element}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* speaker grille */}
          <div className="mt-3 flex items-center gap-2">
            <div className="chrome h-1 flex-1 rounded-full opacity-60" />
            <p className="shrink-0 text-[8px] uppercase tracking-[0.3em] text-amber-200/35">
              sonification · not music
            </p>
            <div className="chrome h-1 flex-1 rounded-full opacity-60" />
          </div>
          <div
            aria-hidden
            className="mt-2 h-8 rounded-lg border border-black/60"
            style={{
              background:
                'repeating-linear-gradient(90deg, #1a120c 0 3px, #0e0a07 3px 6px)',
            }}
          />
        </div>
      </div>

      {/* record selector strip, like the button row on a real jukebox */}
      <div className="mt-3 flex w-full flex-wrap justify-center gap-1.5">
        {datasets.map((d, i) => {
          const col = ELEMENT_COLOR[d.element] ?? '#999'
          const isActive = d.id === activeId
          return (
            <button
              key={d.id}
              onClick={() => pick(d.id)}
              aria-label={`Select record ${i + 1}: ${d.short}`}
              className="group flex min-w-[8.2rem] flex-1 flex-col gap-0.5 rounded-md border px-2 py-1.5 text-left transition sm:max-w-[9.5rem]"
              style={{
                borderColor: isActive ? col : 'rgba(255,255,255,.10)',
                background: isActive ? `${col}1f` : 'rgba(255,255,255,.03)',
              }}
            >
              <span className="flex items-center gap-1.5">
                <span className="font-mono text-[8px]" style={{ color: col }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="truncate text-[9.5px] font-medium text-white/85">{d.short}</span>
              </span>
              <span className="truncate text-[7.5px] uppercase tracking-wider text-white/30">
                {d.sensor}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
