import { useEffect, useRef, useState } from 'react'
import type { Scene } from '../lib/world'

/**
 * The world behind the cabinet.
 *
 * A hand-painted, Ghibli-styled backdrop per scene (storm, night, aurora, fire,
 * deep space, golden meadow), topped with live weather that is drawn rather than
 * painted: rain with individual streaks and splash rings, multi-branch
 * lightning, drifting cumulus with lit bellies, aurora curtains, ash and pollen
 * motes, fireflies, and the warm spill of the cabinet's own light onto the
 * grass. Everything is a layer of the same scene, so switching discs changes the
 * world you are standing in.
 */
export function World({ scene, powered, level }: { scene: Scene; powered: boolean; level: number }) {
  const [loaded, setLoaded] = useState<string | null>(null)

  // warm the next backdrop so switching records is a dissolve, not a flash
  useEffect(() => {
    const img = new Image()
    img.src = scene.art
  }, [scene.art])

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      {/* ---- the painted backdrop, cross-faded on scene change ---- */}
      {(['meadow', 'storm', 'night', 'aurora', 'fire', 'space'] as const).map((kind) => {
        const on = scene.kind === kind
        if (on && loaded !== kind) queueMicrotask(() => setLoaded(kind))
        return (
          <img
            key={kind}
            src={`/art/world-${kind}.webp`}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms]"
            style={{
              opacity: on ? 1 : 0,
              transform: on ? 'scale(1.02)' : 'scale(1)',
              transition: 'opacity 1.2s ease, transform 9s linear',
            }}
          />
        )
      })}

      {/* ---- a slow grade so every sky reads at the same exposure ---- */}
      <div
        className="absolute inset-0 transition-opacity duration-1000"
        style={{
          background: scene.dark
            ? 'linear-gradient(to bottom, rgba(6,10,20,.34) 0%, rgba(6,10,20,.10) 42%, rgba(8,10,14,.42) 100%)'
            : 'linear-gradient(to bottom, rgba(255,240,200,.06) 0%, rgba(255,236,196,.02) 45%, rgba(60,44,20,.20) 100%)',
        }}
      />

      {/* ---- cumulus: painted clouds drifting in front of the art ---- */}
      <Clouds scene={scene} />

      {/* ---- aurora curtains ---- */}
      {scene.aurora > 0 && <Aurora intensity={scene.aurora} />}

      {/* ---- rain: streaks with splash rings ---- */}
      {scene.rain > 0 && <Rain count={scene.rain} />}

      {/* ---- snow / spray ---- */}
      {scene.snow > 0 && <Snow count={scene.snow} />}

      {/* ---- lightning: branches and a whole-sky flash ---- */}
      {scene.lightning > 0 && <Lightning perMinute={scene.lightning} />}

      {/* ---- pollen, ash, sparks ---- */}
      {scene.motes > 0 && <Motes count={scene.motes} scene={scene} />}

      {/* ---- fireflies ---- */}
      {scene.fireflies > 0 && <Fireflies count={scene.fireflies} />}

      {/* ---- the cabinet's light on the grass ---- */}
      <div
        className="absolute inset-x-0 bottom-0 h-[46%] transition-opacity duration-700"
        style={{
          background: `radial-gradient(60% 100% at 50% 100%, ${scene.glow} 0%, transparent 72%)`,
          opacity: powered ? 0.55 + Math.min(0.3, level * 1.6) : 0.1,
        }}
      />

      {/* ---- vignette ---- */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(118% 92% at 50% 46%, transparent 44%, ${scene.vignette} 100%)`,
        }}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ clouds */

function Clouds({ scene }: { scene: Scene }) {
  if (scene.cloudCount <= 0) return null
  return (
    <div className="absolute inset-0">
      {Array.from({ length: scene.cloudCount }, (_, i) => {
        const seed = (i * 97) % 100
        const top = 2 + ((seed * 7) % 44)
        const scale = 0.5 + ((seed * 13) % 70) / 100
        const dur = 90 + ((seed * 31) % 90)
        const delay = -((seed * 17) % dur)
        return (
          <div
            key={i}
            className="cloud absolute"
            style={{
              top: `${top}%`,
              width: `${18 * scale}vw`,
              height: `${7 * scale}vw`,
              left: '-30vw',
              opacity: scene.cloudOpacity * (0.6 + ((seed % 30) / 100)),
              animationDuration: `${dur}s`,
              animationDelay: `${delay}s`,
              ['--drift' as string]: `${140 + scale * 40}vw`,
            }}
          >
            <CloudBlob colour={scene.cloud} />
          </div>
        )
      })}
    </div>
  )
}

/** one cumulus: a stack of soft lobes with a lit belly and a shadowed base */
function CloudBlob({ colour }: { colour: string }) {
  return (
    <svg viewBox="0 0 200 78" className="h-full w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="cl" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colour} stopOpacity="0.95" />
          <stop offset="55%" stopColor={colour} stopOpacity="0.72" />
          <stop offset="100%" stopColor="#8fa6b4" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      <g fill="url(#cl)">
        <ellipse cx="52" cy="50" rx="44" ry="24" />
        <ellipse cx="95" cy="38" rx="46" ry="30" />
        <ellipse cx="140" cy="50" rx="42" ry="23" />
        <ellipse cx="168" cy="58" rx="26" ry="15" />
        <ellipse cx="30" cy="60" rx="26" ry="14" />
      </g>
    </svg>
  )
}

/* ------------------------------------------------------------------ aurora */

function Aurora({ intensity }: { intensity: number }) {
  const curtains = [
    { x: 12, w: 34, hue: '#5cf0c0', d: 26 },
    { x: 34, w: 42, hue: '#79ffd6', d: 34 },
    { x: 58, w: 30, hue: '#b48cff', d: 22 },
    { x: 74, w: 26, hue: '#6ee7ff', d: 30 },
  ]
  return (
    <div className="absolute inset-x-0 top-0 h-[68%] opacity-90" style={{ filter: 'blur(1px)' }}>
      {curtains.map((c, i) => (
        <div
          key={i}
          className="absolute top-0 h-full"
          style={{
            left: `${c.x}%`,
            width: `${c.w}%`,
            background: `linear-gradient(to bottom, transparent 0%, ${c.hue}${Math.round(
              40 + intensity * 55,
            ).toString(16)} 26%, ${c.hue}55 58%, transparent 92%)`,
            maskImage: 'radial-gradient(60% 100% at 50% 0%, #000 20%, transparent 78%)',
            WebkitMaskImage: 'radial-gradient(60% 100% at 50% 0%, #000 20%, transparent 78%)',
            transform: 'skewX(-9deg)',
            animation: `aurora-drift ${c.d}s ease-in-out infinite alternate`,
            animationDelay: `${-i * 3}s`,
            mixBlendMode: 'screen',
          }}
        />
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------- rain */

function Rain({ count }: { count: number }) {
  const drops = Array.from({ length: count }, (_, i) => {
    const seed = (i * 137) % 997
    return {
      left: (seed % 1000) / 10,
      delay: -((seed % 400) / 100) * 1.6,
      dur: 0.55 + ((seed % 30) / 100),
      len: 12 + ((seed % 26) | 0),
      op: 0.2 + ((seed % 45) / 100),
      sway: ((seed % 7) - 3) * 0.9,
    }
  })
  const splashes = Array.from({ length: Math.round(count / 5) }, (_, i) => {
    const seed = (i * 271) % 991
    return {
      left: (seed % 1000) / 10,
      delay: -((seed % 300) / 100) * 1.4,
      dur: 0.9 + ((seed % 40) / 100),
      size: 12 + ((seed % 22) | 0),
    }
  })
  return (
    <div className="absolute inset-0 overflow-hidden">
      {drops.map((d, i) => (
        <span
          key={i}
          className="rain-streak absolute top-[-12%] block"
          style={{
            left: `${d.left}%`,
            height: d.len,
            width: 1.3,
            background: 'linear-gradient(to bottom, rgba(220,240,255,0), rgba(226,244,255,.95))',
            opacity: d.op,
            animationDuration: `${d.dur}s`,
            animationDelay: `${d.delay}s`,
            transform: `rotate(${9 + d.sway}deg)`,
          }}
        />
      ))}
      {/* splash rings where the rain lands in the grass */}
      {splashes.map((s, i) => (
        <span
          key={`s${i}`}
          className="splash absolute bottom-[2%] rounded-[50%] border border-[#dff2ff]"
          style={{
            left: `${s.left}%`,
            width: s.size,
            height: s.size * 0.34,
            opacity: 0,
            animationDuration: `${s.dur}s`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------- snow */

function Snow({ count }: { count: number }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {Array.from({ length: count }, (_, i) => {
        const seed = (i * 211) % 983
        return (
          <span
            key={i}
            className="absolute top-[-5%] rounded-full bg-white"
            style={{
              left: `${(seed % 1000) / 10}%`,
              width: 2 + (seed % 3),
              height: 2 + (seed % 3),
              opacity: 0.35 + (seed % 50) / 100,
              animation: `snow-fall ${7 + (seed % 9)}s linear infinite`,
              animationDelay: `${-((seed % 70) / 10)}s`,
            }}
          />
        )
      })}
    </div>
  )
}

/* --------------------------------------------------------------- lightning */

function Lightning({ perMinute }: { perMinute: number }) {
  const [flash, setFlash] = useState(0)
  const [bolt, setBolt] = useState<string>('')
  const timer = useRef<number>(0)

  useEffect(() => {
    // a real storm does not flash on a metronome: Poisson gaps
    const meanGap = 60000 / Math.max(1, perMinute)
    const tick = () => {
      const gap = -Math.log(Math.random()) * meanGap + 900
      timer.current = window.setTimeout(() => {
        setBolt(makeBolt())
        setFlash((f) => f + 1)
        tick()
      }, gap)
    }
    tick()
    return () => window.clearTimeout(timer.current)
  }, [perMinute])

  return (
    <div key={flash} className="absolute inset-0 overflow-hidden">
      <div className="lightning-flash absolute inset-0 bg-[#dfeaff]" />
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ filter: 'drop-shadow(0 0 6px rgba(190,220,255,.95))' }}
      >
        <path d={bolt} fill="none" stroke="#f2f8ff" strokeWidth="0.55" strokeLinejoin="round" className="bolt-strike" />
        <path d={bolt} fill="none" stroke="#bcd9ff" strokeWidth="1.6" strokeLinejoin="round" opacity="0.35" className="bolt-strike" />
      </svg>
    </div>
  )
}

function makeBolt() {
  const x0 = 25 + Math.random() * 50
  let x = x0
  let y = 0
  let d = `M${x.toFixed(2)} 0`
  while (y < 46) {
    y += 3 + Math.random() * 5
    x += (Math.random() - 0.5) * 9
    d += ` L${x.toFixed(2)} ${y.toFixed(2)}`
    if (Math.random() < 0.3) {
      // a fork
      let fx = x
      let fy = y
      let fd = ` M${fx.toFixed(2)} ${fy.toFixed(2)}`
      for (let i = 0; i < 4; i++) {
        fy += 2 + Math.random() * 3
        fx += (Math.random() - 0.5) * 12
        fd += ` L${fx.toFixed(2)} ${fy.toFixed(2)}`
      }
      d += fd
    }
  }
  return d
}

/* ------------------------------------------------------------------- motes */

function Motes({ count, scene }: { count: number; scene: Scene }) {
  const warm = scene.kind === 'fire' ? '#d8c2a8' : '#ffe9a8'
  return (
    <div className="absolute inset-0 overflow-hidden">
      {Array.from({ length: count }, (_, i) => {
        const seed = (i * 313) % 977
        return (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${(seed % 1000) / 10}%`,
              bottom: `${(seed % 40) / 2}%`,
              width: 2 + (seed % 4),
              height: 2 + (seed % 4),
              background: warm,
              opacity: 0.35 + (seed % 40) / 100,
              filter: 'blur(0.4px)',
              animation: `mote-drift ${12 + (seed % 14)}s ease-in-out infinite`,
              animationDelay: `${-((seed % 90) / 10)}s`,
            }}
          />
        )
      })}
    </div>
  )
}

/* --------------------------------------------------------------- fireflies */

function Fireflies({ count }: { count: number }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {Array.from({ length: count }, (_, i) => {
        const seed = (i * 181) % 971
        return (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${(seed % 1000) / 10}%`,
              top: `${45 + ((seed % 50) / 2)}%`,
              width: 3 + (seed % 3),
              height: 3 + (seed % 3),
              background: '#ffe9a0',
              boxShadow: '0 0 8px 3px rgba(255,222,130,.55)',
              animation: `firefly ${6 + (seed % 8)}s ease-in-out infinite`,
              animationDelay: `${-((seed % 80) / 10)}s`,
            }}
          />
        )
      })}
    </div>
  )
}

/**
 * The nearest blades of grass, drawn *over* the cabinet's plinth and the girl's
 * feet so both look planted in the meadow instead of pasted onto it.
 */
export function ForegroundGrass({ scene }: { scene: Scene }) {
  // the grass belongs to the stage; once you scroll into the analysis it steps
  // out of the way instead of sitting on top of the copy
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 120)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 bottom-0 z-30 h-[13vh] overflow-hidden transition-opacity duration-500 ${
        scrolled ? 'opacity-0' : 'opacity-100'
      }`}
      aria-hidden
    >
      <svg
        viewBox="0 0 1440 150"
        preserveAspectRatio="none"
        className="h-full w-full"
        style={{
          animation: scene.rain ? 'grass-wind 2.2s ease-in-out infinite' : 'grass-wind 7s ease-in-out infinite',
          transformOrigin: '50% 100%',
        }}
      >
        <defs>
          <linearGradient id="bladeFront" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={darken(scene.grass[0], -22)} />
            <stop offset="100%" stopColor={scene.grass[1]} />
          </linearGradient>
        </defs>
        <g fill="url(#bladeFront)" opacity="0.96" style={{ filter: 'drop-shadow(0 -2px 5px rgba(0,0,0,.3))' }}>
          {Array.from({ length: 170 }, (_, i) => {
            const x = (i / 170) * 1440 + ((i * 29) % 17)
            const h = 34 + ((i * 47) % 84)
            const w = 4 + ((i * 13) % 7)
            return (
              <path
                key={i}
                d={`M${x} 150 C ${x - w} ${150 - h * 0.55}, ${x + w} ${150 - h * 0.8}, ${x + w * 0.35} ${
                  150 - h
                } C ${x + w * 1.3} ${150 - h * 0.5}, ${x + w * 1.5} ${150 - h * 0.2}, ${x + w * 1.15} 150 Z`}
              />
            )
          })}
        </g>
        {scene.kind === 'meadow' &&
          Array.from({ length: 26 }, (_, i) => {
            const x = (i / 26) * 1440 + ((i * 61) % 40)
            const y = 126 - ((i * 37) % 26)
            return (
              <g key={`fl${i}`}>
                <path d={`M${x} ${y} v14`} stroke="#7f9c62" strokeWidth="1.6" />
                <circle cx={x} cy={y} r={3.6} fill="#fff6dd" />
                <circle cx={x} cy={y} r={1.5} fill="#f5c840" />
              </g>
            )
          })}
      </svg>
    </div>
  )
}

function darken(hex: string, amount: number) {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, ((n >> 16) & 255) + amount)
  const g = Math.max(0, ((n >> 8) & 255) + amount)
  const b = Math.max(0, (n & 255) + amount)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}
