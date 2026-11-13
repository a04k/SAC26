import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'

/**
 * The opening cut scene.
 *
 * Three hand-drawn frames of the girl — greeting, pointing at the cabinet, then
 * sitting down to listen — cut out of their painted backgrounds and animated
 * over the meadow. The page is scaled and tilted while this plays, then the
 * whole thing pushes in to become the running screen, so the intro does not
 * "go away": it *arrives*.
 */
export function Intro({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState(0) // 0 greet, 1 point, 2 listen, 3 leaving
  const [grain, setGrain] = useState(0)

  useEffect(() => {
    if (phase === 3) {
      const t = window.setTimeout(onDone, 1150)
      return () => window.clearTimeout(t)
    }
    const hold = phase === 0 ? 2600 : 2200
    const t = window.setTimeout(() => {
      setPhase((p) => p + 1)
      setGrain((g) => g + 1)
    }, hold)
    return () => window.clearTimeout(t)
  }, [phase, onDone])

  const poses = ['/art/pose-greet-sprite.webp', '/art/pose-point-sprite.webp', '/art/pose-listen-sprite.webp']
  const lines = [
    'Oh — you made it.',
    'That one. The wooden one. It plays the planet.',
    'Sit with me. Listen.',
  ]

  return (
    <div
      className={`fixed inset-0 z-[60] overflow-hidden transition-[opacity,transform] duration-[1100ms] ${
        phase === 3 ? 'scale-[1.14] opacity-0' : 'scale-100 opacity-100'
      }`}
      style={{ transitionTimingFunction: 'cubic-bezier(.4,0,.2,1)' }}
      aria-label="Introduction"
    >
      {/* the painted meadow, pushed in slowly for a cinematic feel */}
      <img
        src="/art/world-meadow.webp"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ animation: 'intro-push 9s ease-out both' }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(80%_70%_at_50%_45%,transparent_35%,rgba(16,12,6,.55)_100%)]" />
      {/* letterbox bars, for the cut-scene feel */}
      <div className="absolute inset-x-0 top-0 h-[7vh] bg-[#0a0805]" />
      <div className="absolute inset-x-0 bottom-0 h-[7vh] bg-[#0a0805]" />

      {/* the girl, cut out and animated, standing left of frame */}
      <div
        key={grain}
        className="absolute bottom-[22vh] left-[6vw] flex h-[42vh] items-end md:bottom-[7vh] md:left-[7vw] md:h-[66vh]"
        style={{ animation: 'intro-figure 700ms ease-out both' }}
      >
        <img
          src={poses[Math.min(phase, 2)]}
          alt="A girl in a mustard hoodie and brass headphones, greeting you, then pointing at the jukebox."
          className="h-full w-auto object-contain object-bottom drop-shadow-[0_24px_40px_rgba(10,8,4,.6)]"
          style={{
            transition: 'opacity .45s ease, transform .7s cubic-bezier(.34,1.56,.64,1)',
            transform: phase === 1 ? 'translateX(-2%)' : 'none',
          }}
        />
      </div>

      {/* her line, in a hand-lettered plate, in the right half of the frame */}
      <div className="absolute inset-x-0 bottom-[13vh] flex justify-center px-3 md:inset-x-auto md:bottom-auto md:left-[56%] md:top-[42%] md:block md:w-[38vw] md:max-w-[440px] md:px-0">
        <p
          key={`line-${phase}`}
          className="max-w-[34ch] rounded-2xl border border-[#ffe9b8]/45 px-5 py-3 text-center font-display text-[clamp(15px,1.9vw,22px)] font-semibold leading-snug text-[#fff3d4] shadow-[0_18px_40px_-18px_rgba(0,0,0,.9)] backdrop-blur-md"
          style={{ animation: 'line-in 520ms ease-out both', background: 'rgba(18,14,8,.9)' }}
        >
          {lines[Math.min(phase, 2)]}
        </p>
      </div>

      <button
        onClick={onDone}
        className="absolute bottom-[8.5vh] left-1/2 -translate-x-1/2 rounded-full border border-[#ffe9b8]/40 bg-[#120e08]/70 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#ffe9b8] transition hover:bg-[#120e08]/90"
      >
        skip <ChevronDown size={11} className="ml-1 inline" />
      </button>

      {/* frame counter, like a title card */}
      <div className="absolute right-4 top-[8vh] font-mono text-[9px] font-bold uppercase tracking-[0.24em] text-[#ffe9b8]/60">
        {String(Math.min(phase + 1, 3)).padStart(2, '0')} / 03
      </div>
    </div>
  )
}
