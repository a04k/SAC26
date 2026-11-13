import { useMemo } from 'react'

/**
 * The illustrated world: a warm Ghibli-ish sky, three bands of painted hills,
 * slow clouds and drifting pollen. Purely decorative and purely CSS — the only
 * photographic element in the app is NASA's own imagery.
 */
function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

export function Meadow({ dim = false }: { dim?: boolean }) {
  const clouds = useMemo(() => {
    const r = rng(7)
    return Array.from({ length: 7 }, (_, i) => ({
      id: i,
      top: 4 + r() * 34,
      w: 180 + r() * 320,
      h: 40 + r() * 60,
      dur: 120 + r() * 160,
      delay: -r() * 200,
      o: 0.35 + r() * 0.5,
    }))
  }, [])

  const motes = useMemo(() => {
    const r = rng(19)
    return Array.from({ length: 26 }, (_, i) => ({
      id: i,
      left: r() * 100,
      top: 45 + r() * 50,
      d: 2 + r() * 3,
      dur: 9 + r() * 14,
      delay: -r() * 20,
      dx: (r() - 0.5) * 90,
    }))
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="scene-sky absolute inset-0" />

      {/* the low sun behind the cabinet */}
      <div className="scene-sun absolute left-1/2 top-[52%] h-[95vw] w-[95vw] max-h-[900px] max-w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full" />

      {clouds.map((c) => (
        <span
          key={c.id}
          className="cloud"
          style={{
            top: `${c.top}%`,
            width: c.w,
            height: c.h,
            opacity: c.o,
            animationDuration: `${c.dur}s`,
            animationDelay: `${c.delay}s`,
          }}
        />
      ))}

      <div className="scene-hills absolute inset-x-0 bottom-0 h-[52%]" />
      <div className="scene-meadow absolute inset-x-0 bottom-0 h-[34%]" />

      {/* painted grass blades along the bottom edge */}
      <svg
        className="absolute inset-x-0 bottom-0 h-[22%] w-full"
        viewBox="0 0 1440 200"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id="blade" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#5f7f4e" />
            <stop offset="100%" stopColor="#a7c07a" />
          </linearGradient>
        </defs>
        <g fill="url(#blade)" opacity="0.9">
          {Array.from({ length: 90 }, (_, i) => {
            const x = (i / 90) * 1440 + ((i * 37) % 11)
            const h = 60 + ((i * 53) % 120)
            const w = 5 + ((i * 17) % 7)
            return (
              <path
                key={i}
                d={`M${x} 200 C ${x - w} ${200 - h * 0.6}, ${x + w} ${200 - h * 0.8}, ${x + w * 0.4} ${200 - h} C ${x + w * 1.4} ${200 - h * 0.55}, ${x + w * 1.6} ${200 - h * 0.2}, ${x + w * 1.2} 200 Z`}
              />
            )
          })}
        </g>
      </svg>

      {motes.map((m) => (
        <span
          key={m.id}
          className="mote"
          style={{
            left: `${m.left}%`,
            top: `${m.top}%`,
            width: m.d,
            height: m.d,
            animationDuration: `${m.dur}s`,
            animationDelay: `${m.delay}s`,
            ['--dx' as string]: `${m.dx}px`,
          }}
        />
      ))}

      <div className="scene-vignette absolute inset-0" />
      {dim && <div className="absolute inset-0 bg-[#3a2716]/25 backdrop-blur-[1px]" />}
    </div>
  )
}
