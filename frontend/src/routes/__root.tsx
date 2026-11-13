import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Accessibility, Disc3, Info, ScanSearch } from 'lucide-react'
import { useUI } from '../lib/store'

const NAV = [
  { to: '/', label: 'Jukebox', icon: Disc3 },
  { to: '/analyze', label: 'Analyze', icon: ScanSearch },
  { to: '/about', label: 'About', icon: Info },
] as const

export function RootLayout() {
  const { announcement, highContrast, setHighContrast, reduceMotion, setReduceMotion } = useUI()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) setReduceMotion(true)
  }, [setReduceMotion])

  useEffect(() => {
    document.documentElement.classList.toggle('hc', highContrast)
  }, [highContrast])

  return (
    <div className="relative flex h-full min-h-screen flex-col overflow-hidden bg-[#05070f]">
      {/* aurora backdrop */}
      <div
        aria-hidden="true"
        className="terra-aurora pointer-events-none fixed inset-0 opacity-60"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 18% 0%, #0b3b5c 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 88% 12%, #2b1a4d 0%, transparent 58%), radial-gradient(ellipse 80% 60% at 50% 108%, #04283a 0%, transparent 62%)',
        }}
      />

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-black"
      >
        Skip to main content
      </a>

      <header className="relative z-30 flex items-center justify-between gap-4 border-b border-white/[0.06] bg-[#05070f]/70 px-4 py-2.5 backdrop-blur-xl sm:px-6">
        <Link to="/" className="group flex items-center gap-2.5" aria-label="Terra Jukebox home">
          <span className="relative flex h-8 w-8 items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-300 via-sky-500 to-indigo-600 opacity-90 blur-[1px]" />
            <span className="absolute inset-[3px] rounded-full bg-[#05070f]" />
            <span className="relative h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_10px_2px_rgba(34,211,238,0.8)]" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-[15px] font-semibold tracking-tight text-white">
              Terra Jukebox
            </span>
            <span className="mt-0.5 text-[9px] uppercase tracking-[0.22em] text-white/35">
              Earth Information · Sonified
            </span>
          </span>
        </Link>

        <nav aria-label="Main" className="flex items-center gap-1">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = pathname === to
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                  active
                    ? 'bg-white/10 text-white'
                    : 'text-white/45 hover:bg-white/5 hover:text-white/85'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={14} />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setReduceMotion(!reduceMotion)}
            aria-pressed={reduceMotion}
            aria-label="Reduce motion"
            title="Reduce motion"
            className={`rounded-lg p-2 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
              reduceMotion ? 'bg-white/15 text-white' : 'text-white/40 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Accessibility size={15} />
          </button>
          <button
            onClick={() => setHighContrast(!highContrast)}
            aria-pressed={highContrast}
            aria-label="High contrast mode"
            title="High contrast mode"
            className={`rounded-lg border px-2 py-1.5 text-[10px] font-semibold tracking-wider transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
              highContrast
                ? 'border-white bg-white text-black'
                : 'border-white/15 text-white/50 hover:border-white/40 hover:text-white'
            }`}
          >
            HC
          </button>
        </div>
      </header>

      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <main id="main" className="relative z-10 flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
