import { useEffect, useState } from 'react'

/**
 * The girl in the meadow.
 *
 * She is drawn art, not SVG: three painted poses keyed out of their card —
 * waving hello, pointing you at the cabinet, and sitting cross-legged with the
 * headphones on. The pose follows the state of the jukebox: she greets you
 * before the switch is thrown, points while a record is cued, and sits down to
 * listen once the needle drops. She still leans into the weather and sways with
 * the audio level, so the sprite never reads as a pasted cut-out.
 */
const POSE = {
  greet: { src: '/art/pose-greet-sprite.webp', w: 700, h: 299 },
  point: { src: '/art/pose-point-sprite.webp', w: 712, h: 465 },
  listen: { src: '/art/pose-listen-sprite.webp', w: 683, h: 514 },
} as const

export type GirlPose = keyof typeof POSE

export function Girl({
  pose = 'greet',
  weather,
  level,
  playing,
}: {
  pose?: GirlPose
  weather: 'calm' | 'wind' | 'rain'
  level: number
  playing: boolean
}) {
  const [t, setT] = useState(0)

  useEffect(() => {
    let raf = 0
    const t0 = performance.now()
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      setT((now - t0) / 1000)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const gust = weather === 'calm' ? 0.1 : weather === 'wind' ? 0.5 : 0.85
  const sway = Math.sin(t * (weather === 'rain' ? 1.5 : 0.85)) * gust + Math.sin(t * 0.33) * 0.12
  const bob = playing ? Math.sin(t * 1.6) * level * 0.5 : 0
  const pose_ = POSE[pose]
  const sitting = pose === 'listen'

  return (
    <div
      className="pointer-events-none absolute z-20 select-none"
      style={{
        // feet in the grass, clear of the cabinet's plinth
        bottom: sitting ? '1%' : '-1%',
        left: sitting ? 'clamp(-44%, -31vw, -26%)' : 'clamp(-52%, -37vw, -31%)',
        height: sitting ? 'clamp(158px, 31vh, 286px)' : 'clamp(210px, 42vh, 380px)',
        aspectRatio: `${pose_.w} / ${pose_.h}`,
        transform: `rotate(${sway * 1.1 + bob * 0.25}deg) translateY(${bob}px)`,
        transformOrigin: '50% 100%',
        filter: 'drop-shadow(0 14px 16px rgba(20,12,6,.5))',
      }}
      aria-hidden
    >
      <img
        src={pose_.src}
        alt=""
        width={pose_.w}
        height={pose_.h}
        draggable={false}
        className="h-full w-full object-contain object-bottom"
        style={{
          // a shade of the loaded scene tints her coat so she belongs in it
          filter: weather === 'rain' ? 'brightness(.94) saturate(.95)' : undefined,
        }}
      />
    </div>
  )
}
