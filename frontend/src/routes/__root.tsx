import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Accessibility, BookOpen, Disc3, ScanSearch } from 'lucide-react'
import { useUI } from '../lib/store'

/**
 * A quiet header: the cabinet is the hero, so the chrome above it stays thin.
 * Wordmark left, three destinations centre, accessibility right.
 */
export function RootLayout() {
  const { announcement, highContrast, setHighContrast, reduceMotion, setReduceMotion } = useUI()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setReduceMotion(true)
  }, [setReduceMotion])

  useEffect(() => {
    document.documentElement.classList.toggle('hc', highContrast)
  }, [highContrast])

  const nav = [
    { to: '/', label: 'Jukebox', icon: Disc3 },
    { to: '/scan', label: 'Scan a frame', icon: ScanSearch },
    { to: '/about', label: 'The method', icon: BookOpen },
  ] as const

  return (
    <div className="relative flex min-h-screen flex-col bg-[#0a0806]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-amber-100 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-black"
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-40 border-b border-amber-100/[0.07] bg-[#0a0806]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-2 sm:px-5">
          <Link to="/" className="flex items-center gap-2" aria-label="Terra Jukebox — home">
            <span className="relative flex h-6 w-6 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-200 via-orange-400 to-rose-500 opacity-90" />
              <span className="absolute inset-[5px] rounded-full bg-[#0a0806]" />
            </span>
            <span className="text-[12.5px] font-semibold tracking-[0.16em] text-amber-50">
              TERRA JUKEBOX
            </span>
          </Link>

          <nav aria-label="Main" className="ml-auto flex items-center gap-0.5">
            {nav.map(({ to, label, icon: Icon }) => {
              const active = pathname === to
              return (
                <Link
                  key={to}
                  to={to}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11.5px] transition ${
                    active
                      ? 'bg-amber-100/10 text-amber-50'
                      : 'text-amber-100/45 hover:bg-white/[0.04] hover:text-amber-50/90'
                  }`}
                >
                  <Icon size={13} />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="ml-1 flex items-center gap-1 border-l border-white/[0.07] pl-2">
            <button
              onClick={() => setReduceMotion(!reduceMotion)}
              aria-pressed={reduceMotion}
              aria-label="Reduce motion"
              title="Reduce motion"
              className={`rounded-md p-1.5 transition ${
                reduceMotion ? 'bg-amber-100/15 text-amber-50' : 'text-amber-100/35 hover:text-amber-50'
              }`}
            >
              <Accessibility size={14} />
            </button>
            <button
              onClick={() => setHighContrast(!highContrast)}
              aria-pressed={highContrast}
              aria-label="High contrast"
              title="High contrast"
              className={`rounded-md border px-1.5 py-0.5 text-[9.5px] font-semibold tracking-wider transition ${
                highContrast
                  ? 'border-amber-100 bg-amber-100 text-black'
                  : 'border-white/15 text-amber-100/45 hover:border-amber-100/50 hover:text-amber-50'
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

      <main id="main" className="relative flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-white/[0.05] px-4 py-3 text-center text-[9.5px] leading-relaxed text-amber-100/25">
        Frames © NASA SVS · NASA Earth Observatory · NASA GMAO · NASA/ESA Hubble. Every tone is a
        measurement — nothing here is composed.
      </footer>
    </div>
  )
}
