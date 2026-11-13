import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Accessibility, BookOpen, Disc3, VolumeX, Waves } from 'lucide-react'
import { useUI } from '../lib/store'
import { mechanism } from '../lib/audio/mechanism'
import { api } from '../lib/api'
import { sceneFor } from '../lib/world'
import { ForegroundGrass, World } from '../components/World'

/**
 * There is one background on this site: the world the cabinet stands in. The
 * header is a small paper label floating over it, and it changes colour with
 * the scene so the whole frame stays legible in a hurricane or at midnight.
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
    selectedId,
    level,
    powered,
  } = useUI()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  const { data } = useQuery({ queryKey: ['datasets'], queryFn: api.datasets, staleTime: 1000 * 60 * 30 })
  const dataset = data?.find((d) => d.id === selectedId) ?? data?.[0]
  const scene = sceneFor(dataset?.model ?? 'plume', dataset?.id)

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

  const dark = scene.dark

  const nav = [
    { to: '/', label: 'Jukebox', icon: Disc3 },
    { to: '/scan', label: 'Scan a frame', icon: Waves },
    { to: '/about', label: 'The method', icon: BookOpen },
  ] as const

  return (
    <div className="relative flex min-h-screen flex-col">
      <World scene={scene} powered={powered} level={level} />

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-cream focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-ink"
      >
        Skip to the cabinet
      </a>

      <header className="relative z-40 px-3 pt-2 sm:px-5">
        <div className="mx-auto flex max-w-[1500px] items-center gap-2">
          <Link to="/" className="group flex items-center gap-2 rounded-2xl px-1 py-1" aria-label="Terra Tunes — home">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#6b4a20b2] bg-gradient-to-br from-[#f7dfa9] via-[#e0a95f] to-[#b57a3a] shadow-[0_2px_0_#6b4a20,0_6px_14px_-6px_rgba(20,12,4,.9)]">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#3a2716]">
                <span className="h-4 w-4 overflow-hidden rounded-full">
                  <img src="/art/discs/earth.webp" alt="" className="h-full w-full object-cover" />
                </span>
              </span>
            </span>
            <span className="hidden flex-col leading-none sm:flex">
              <span
                className={`whitespace-nowrap font-display text-[16px] font-semibold tracking-[0.05em] ${
                  dark ? 'text-[#fff3d4] drop-shadow-[0_1px_6px_rgba(0,0,0,.75)]' : 'text-ink'
                }`}
              >
                Terra Tunes
              </span>
              <span
                className={`mt-0.5 whitespace-nowrap text-[8.5px] font-bold uppercase tracking-[0.22em] ${
                  dark ? 'text-[#ffe9b8cc]' : 'text-[#7c6144d9]'
                }`}
              >
                earth information jukebox
              </span>
            </span>
          </Link>

          <nav
            aria-label="Main"
            className={`ml-auto flex items-center gap-1 rounded-full px-1 py-1 ${
              dark
                ? 'border border-[#ffe9b840] bg-[#1b150e8c] backdrop-blur-md'
                : 'border-2 border-[#d8b077cc] bg-[#fff8e8b2] backdrop-blur-md'
            }`}
          >
            {nav.map(({ to, label, icon: Icon }) => {
              const active = pathname === to
              return (
                <Link
                  key={to}
                  to={to}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-bold transition ${
                    active
                      ? dark
                        ? 'bg-[#ffe9b840] text-[#fff6e0]'
                        : 'bg-[#e8b96f99] text-ink'
                      : dark
                        ? 'text-[#ffe9b8b2] hover:bg-white/10 hover:text-[#fff6e0]'
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
              className={`rounded-full p-1.5 transition ${
                dark
                  ? 'border border-[#ffe9b840] bg-[#1b150e8c] text-[#ffe9b8cc] hover:text-[#fff6e0]'
                  : 'border-2 border-[#d8b077cc] bg-[#fff8e8b2] text-ink-soft hover:text-ink'
              }`}
            >
              <VolumeX size={13} />
            </button>
            <button
              onClick={() => setReduceMotion(!reduceMotion)}
              aria-pressed={reduceMotion}
              aria-label="Reduce motion"
              title="Reduce motion"
              className={`rounded-full p-1.5 transition ${
                reduceMotion
                  ? 'bg-[#e8b96fcc] text-ink'
                  : dark
                    ? 'border border-[#ffe9b840] bg-[#1b150e8c] text-[#ffe9b8cc] hover:text-[#fff6e0]'
                    : 'border-2 border-[#d8b077cc] bg-[#fff8e8b2] text-ink-soft hover:text-ink'
              }`}
            >
              <Accessibility size={13} />
            </button>
            <button
              onClick={() => setHighContrast(!highContrast)}
              aria-pressed={highContrast}
              aria-label="High contrast"
              title="High contrast"
              className={`rounded-full border-2 px-1.5 py-0.5 text-[9px] font-black tracking-wider transition ${
                highContrast
                  ? 'border-[#3a2716] bg-[#3a2716] text-[#fff3d4]'
                  : dark
                    ? 'border-[#ffe9b84c] text-[#ffe9b8cc] hover:text-[#fff6e0]'
                    : 'border-[#7d5a30] text-ink-soft hover:text-ink'
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

      {pathname === '/' && <ForegroundGrass scene={scene} />}

      <footer
        className={`pointer-events-none relative z-20 px-4 pb-1 pt-0.5 text-center text-[9px] font-semibold leading-tight ${
          pathname === '/' ? 'hidden' : ''
        } ${dark ? 'text-[#ffe9b880]' : 'text-[#3a2a1880]'}`}
      >
        Frames © NASA · every sound is a measurement of one · Earth Information Jukebox
      </footer>
    </div>
  )
}
