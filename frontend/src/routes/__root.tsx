import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Accessibility, BookOpen, Disc3, VolumeX, Waves } from 'lucide-react'
import { useUI } from '../lib/store'
import { mechanism } from '../lib/audio/mechanism'
import { Meadow } from '../components/Meadow'

/**
 * The meadow is the frame around the cabinet, so the header is a small painted
 * sign hung over it rather than a dark app bar.
 */
export function RootLayout() {
  const {
    announcement,
    highContrast,
    setHighContrast,
    reduceMotion,
    setReduceMotion,
    mechanismMuted,
    setMechanismMuted,
  } = useUI()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setReduceMotion(true)
  }, [setReduceMotion])

  useEffect(() => {
    document.documentElement.classList.toggle('hc', highContrast)
    document.documentElement.classList.toggle('tt-reduce', reduceMotion)
  }, [highContrast, reduceMotion])

  useEffect(() => {
    mechanism.setMuted(mechanismMuted)
  }, [mechanismMuted])

  const nav = [
    { to: '/', label: 'Jukebox', icon: Disc3 },
    { to: '/scan', label: 'Scan a frame', icon: Waves },
    { to: '/about', label: 'The method', icon: BookOpen },
  ] as const

  return (
    <div className="relative flex min-h-screen flex-col">
      <Meadow />

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-cream focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-ink"
      >
        Skip to the cabinet
      </a>

      <header className="relative z-30 px-3 pt-3 sm:px-5">
        <div className="mx-auto flex max-w-[1180px] items-center gap-2">
          <Link
            to="/"
            className="group flex items-center gap-2 rounded-2xl px-1 py-1"
            aria-label="Terra Tunes — home"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#7d5a30] bg-gradient-to-br from-[#f7dfa9] via-[#e0a95f] to-[#b57a3a] shadow-[0_2px_0_#7d5a30,0_6px_10px_-6px_rgba(60,38,12,.9)]">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#4a3521]">
                <span className="h-3.5 w-3.5 overflow-hidden rounded-full">
                  <img src="/art/discs/earth.webp" alt="" className="h-full w-full object-cover" />
                </span>
              </span>
            </span>
            <span className="flex flex-col leading-none">
              <span className="font-display text-[15px] font-semibold tracking-[0.06em] text-ink drop-shadow-[0_1px_0_rgba(255,248,230,.7)]">
                Terra Tunes
              </span>
              <span className="mt-0.5 text-[8.5px] font-bold uppercase tracking-[0.22em] text-ink-soft/80">
                earth information jukebox
              </span>
            </span>
          </Link>

          <nav aria-label="Main" className="ml-auto flex items-center gap-1 rounded-full border-2 border-[#d8b077] bg-[#fff8e8]/85 px-1 py-1 shadow-[0_2px_0_#d8b077] backdrop-blur">
            {nav.map(({ to, label, icon: Icon }) => {
              const active = pathname === to
              return (
                <Link
                  key={to}
                  to={to}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-bold transition ${
                    active
                      ? 'bg-[#e8b96f]/60 text-ink shadow-[0_1px_0_#fff8e8_inset]'
                      : 'text-ink-soft hover:bg-[#f7e6c4] hover:text-ink'
                  }`}
                >
                  <Icon size={13} />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="ml-1 flex items-center gap-1">
            <button
              onClick={() => setMechanismMuted(!mechanismMuted)}
              aria-pressed={mechanismMuted}
              aria-label="Mute the cabinet mechanism"
              title="Mute the cabinet mechanism"
              className="rounded-full border-2 border-[#d8b077] bg-[#fff8e8]/80 p-1.5 text-ink-soft transition hover:text-ink"
            >
              <VolumeX size={13} />
            </button>
            <button
              onClick={() => setReduceMotion(!reduceMotion)}
              aria-pressed={reduceMotion}
              aria-label="Reduce motion"
              title="Reduce motion"
              className={`rounded-full border-2 border-[#d8b077] p-1.5 transition ${
                reduceMotion ? 'bg-[#e8b96f]/70 text-ink' : 'bg-[#fff8e8]/80 text-ink-soft hover:text-ink'
              }`}
            >
              <Accessibility size={13} />
            </button>
            <button
              onClick={() => setHighContrast(!highContrast)}
              aria-pressed={highContrast}
              aria-label="High contrast"
              title="High contrast"
              className={`rounded-full border-2 border-[#7d5a30] px-1.5 py-0.5 text-[9px] font-black tracking-wider transition ${
                highContrast ? 'bg-ink text-cream' : 'bg-[#fff8e8]/80 text-ink-soft hover:text-ink'
              }`}
            >
              HC
            </button>
          </div>
        </div>
      </header>

      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <main id="main" className="relative z-10 flex-1">
        <Outlet />
      </main>

      <footer className="relative z-10 px-4 pb-5 pt-2 text-center text-[10px] font-semibold leading-relaxed text-ink/55">
        Every frame is NASA&apos;s. Every sound is a measurement of one. · NASA Space Apps Challenge
        2026 — The Earth Information Jukebox
      </footer>
    </div>
  )
}
