import { useMemo, useRef } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import {
  CARD,
  CRADLE,
  DOME,
  GLOBE,
  JEWEL,
  POWER_FRAME,
  PLAY_FRAME,
  SPEAKER,
  TUBES,
} from '../lib/geometry'
import { api } from '../lib/api'
import type { Dataset } from '../lib/types'
import { useUI } from '../lib/store'
import { EarthDisc } from './EarthDisc'
import { VinylDisc } from './VinylDisc'

const MODEL_WORD: Record<string, string> = {
  wind: 'Airflow',
  storm: 'Storm',
  fire: 'Fire',
  ocean: 'Ocean',
  city: 'City lights',
  canopy: 'Canopy',
  plume: 'Plume',
  space: 'Deep space',
}

const pct = (n: number) => `${n * 100}%`

/**
 * The cabinet.
 *
 * The painting is served unmodified; every control is DOM positioned from
 * OpenCV measurements of that exact image (`lib/geometry`). The app supplies
 * what the painting cannot: lit tubes, a breathing globe, a disc in the cradle,
 * a switch that throws, and a speaker that moves with the signal.
 */
export function Jukebox({
  datasets,
  selectedId,
  powered,
  playing,
  onPower,
  onPlay,
  onStep,
  level,
  spectrum,
  progress,
  cradleRef,
}: {
  datasets: Dataset[]
  selectedId: string
  powered: boolean
  playing: boolean
  onPower: () => void
  onPlay: () => void
  /** step the carousel to the previous (-1) or next (+1) record */
  onStep: (dir: 1 | -1) => void
  level: number
  spectrum: number[]
  /** 0–1 playback position, for the card's groove line */
  progress: number
  cradleRef: React.RefObject<HTMLDivElement | null>
}) {
  const selected = datasets.find((d) => d.id === selectedId) ?? datasets[0]
  const index = Math.max(0, datasets.findIndex((d) => d.id === selectedId))
  const volume = useUI((s) => s.volume)
  const setVolume = useUI((s) => s.setVolume)

  const bubbles = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => ({
        id: i,
        left: 10 + ((i * 37) % 62),
        delay: -((i * 1.9) % 6),
        dur: 4.4 + ((i * 1.3) % 3),
        size: 2 + ((i * 7) % 3),
      })),
    [],
  )

  const bars = spectrum.length ? spectrum : Array.from({ length: 26 }, () => 0.05)

  return (
    <div className="relative mx-auto w-full max-w-[1180px]">
      <div
        className="cabinet-glow pointer-events-none absolute -inset-x-[14%] -bottom-[6%] -top-[4%] -z-10 rounded-[50%] blur-2xl"
        style={{ opacity: powered ? 0.95 : 0.12 }}
        aria-hidden
      />

      <div
        className={`cabinet relative overflow-hidden rounded-[26px] shadow-[0_36px_80px_-34px_rgba(56,36,12,.8)] ${
          powered ? 'cabinet-on' : 'cabinet-off'
        }`}
      >
        <img
          src="/art/jukebox.webp"
          alt="An illustrated wooden jukebox with brass trim and tall amber glass tubes, standing in a summer meadow at golden hour."
          className="block w-full select-none"
          draggable={false}
        />

        {/* ---------------- the glass tubes: light + level ---------------- */}
        {TUBES.map((t, i) => (
          <div
            key={i}
            aria-hidden
            className="absolute overflow-hidden rounded-full"
            style={{ left: pct(t.left), top: pct(t.top), width: pct(t.width), height: pct(t.height) }}
          >
            <div className="tube-live absolute inset-0" style={{ opacity: powered ? 1 : 0.08 }} />
            <div
              className="absolute inset-x-0 bottom-0 transition-[height] duration-100"
              style={{
                height: `${8 + Math.min(1, level * 3.4) * 90}%`,
                background:
                  'linear-gradient(to top, rgba(255,251,232,.98), rgba(255,214,128,.95) 42%, rgba(255,150,58,.85))',
                opacity: powered ? 1 : 0.18,
                filter: 'blur(1.1px)',
              }}
            />
            {powered &&
              bubbles.map((b) => (
                <span
                  key={b.id}
                  className="tube-bubble"
                  style={{
                    left: `${b.left}%`,
                    bottom: -4,
                    width: b.size,
                    height: b.size,
                    animationDelay: `${b.delay}s`,
                    animationDuration: `${b.dur}s`,
                  }}
                />
              ))}
          </div>
        ))}

        {/* ---------------- the dome: live Earth + spectrum halo ---------------- */}
        <div
          className="absolute"
          style={{ left: pct(DOME.left), top: pct(DOME.top), width: pct(DOME.width), height: pct(DOME.height) }}
        >
          {/* the halo: one bar per analyser band, arranged on an arc above the
              globe. Each bar lives in its own rotated frame, so the ring stays
              centred on the globe at any cabinet size. */}
          <div aria-hidden className="absolute inset-0 overflow-hidden rounded-[16px]">
            {bars.map((v, i) => {
              const a = -78 + (i / bars.length) * 156
              return (
                <span
                  key={i}
                  className="absolute inset-0"
                  style={{ transform: `rotate(${a}deg)`, transition: 'transform .1s linear' }}
                >
                  <span
                    className="absolute left-1/2 rounded-full"
                    style={{
                      top: '15%',
                      width: '1.5%',
                      height: `${10 + v * 17}%`,
                      transform: 'translateX(-50%)',
                      background: `hsla(${34 + v * 44}, 94%, ${62 + v * 14}%, ${playing ? 0.32 + v * 0.62 : 0.1})`,
                      boxShadow: playing ? '0 0 3px rgba(255,214,140,.8)' : 'none',
                    }}
                  />
                </span>
              )
            })}
          </div>

          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{
              left: pct((GLOBE.cx - DOME.left) / DOME.width),
              top: pct((GLOBE.cy - DOME.top) / DOME.height),
              width: pct(GLOBE.d / DOME.width),
              aspectRatio: '1',
              filter: powered
                ? `drop-shadow(0 0 ${5 + level * 20}px rgba(150,230,255,.9))`
                : 'drop-shadow(0 0 3px rgba(90,120,140,.3)) brightness(.55) saturate(.7)',
              transition: 'filter .5s ease',
            }}
          >
            <EarthDisc className="h-full w-full object-contain" />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle at 32% 26%, rgba(255,255,255,.34), transparent 52%)',
                mixBlendMode: 'screen',
              }}
            />
          </div>
        </div>

        {/* ---------------- the cradle: the loaded disc ---------------- */}
        <div
          ref={cradleRef}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: pct(CRADLE.cx), top: pct(CRADLE.cy), width: pct(CRADLE.d) }}
          aria-hidden
        >
          {selected && (
            <div
              className="w-full"
              style={{
                transform: 'perspective(340px) rotateX(56deg)',
                filter: powered
                  ? `drop-shadow(0 0 ${4 + level * 16}px rgba(255,190,110,.9))`
                  : 'brightness(.6)',
                transition: 'filter .3s ease',
              }}
            >
              <VinylDisc
                id={selected.id}
                size={64}
                spinning={playing}
                labelUrl={api.frameUrl(selected.id)}
                title={selected.short}
                style={{ ['--size' as string]: '100%' }}
                className="h-full w-full"
              />
            </div>
          )}
        </div>

        {/* ---------------- the tonearm: swings in when the needle drops ------- */}
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            left: pct(DOME.left + DOME.width * 0.82),
            top: pct(DOME.top + DOME.height * 0.16),
            width: pct(DOME.width * 0.42),
            height: pct(DOME.height * 0.7),
            transformOrigin: '88% 6%',
            transform: `rotate(${playing ? 6 : -26}deg)`,
            transition: 'transform 900ms cubic-bezier(.34,1.3,.5,1)',
            opacity: powered ? 1 : 0.55,
          }}
        >
          <span
            className="absolute right-[10%] top-[4%] block h-[92%] w-[7%] rounded-full"
            style={{
              background: 'linear-gradient(to bottom,#f6e2ba,#c39a63 40%,#8a6234)',
              boxShadow: '0 1px 3px rgba(0,0,0,.55)',
            }}
          />
          <span
            className="absolute bottom-[-4%] left-[-6%] block h-[13%] w-[26%] rounded-[2px]"
            style={{
              background: 'linear-gradient(#f2dcb2,#a97c45)',
              boxShadow: '0 1px 3px rgba(0,0,0,.6)',
            }}
          />
          <span
            className="absolute right-[4%] top-0 block h-[16%] w-[20%] rounded-full"
            style={{ background: 'radial-gradient(circle at 40% 35%,#fff3d6,#b98a4a)' }}
          />
        </div>

        {/* ---------------- the cream card: what is on the platter ---------------- */}
        <div
          className="absolute"
          style={{ left: pct(CARD.left), top: pct(CARD.top), width: pct(CARD.width), height: pct(CARD.height) }}
        >
          <div className={`label-card flex h-full flex-col overflow-hidden ${powered ? '' : 'label-card-off'}`}>
            <div className="flex items-baseline justify-between px-[4%] pt-[2.6%]">
              <span className="font-display text-[clamp(6px,.68vw,11px)] font-bold uppercase tracking-[0.16em] text-[#6b4a20]">
                side A · {String(index + 1).padStart(2, '0')}/{datasets.length}
              </span>
              <span className="truncate font-display text-[clamp(5px,.56vw,9px)] uppercase tracking-[0.1em] text-[#8a6636]">
                {selected?.sensor ?? ''}
              </span>
            </div>
            <p className="truncate px-[4%] font-display text-[clamp(8px,1.15vw,19px)] font-semibold leading-tight text-[#3a2716]">
              {selected?.short ?? '—'}
            </p>
            <div className="flex items-baseline justify-between px-[4%]">
              <span className="font-display text-[clamp(5px,.6vw,9.5px)] font-bold uppercase tracking-[0.14em] text-[#8a5a1c]">
                {selected ? MODEL_WORD[selected.model] ?? selected.model : ''}
              </span>
              <span className="font-mono text-[clamp(5px,.56vw,9px)] font-bold text-[#8a6636]">
                {playing ? 'playing' : powered ? 'ready' : 'off'}
              </span>
            </div>
            <div className="mt-auto px-[4%] pb-[3%]">
              <div className="relative h-[3px] overflow-hidden rounded-full bg-[#c8a271]/60">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-[#8a4c12]"
                  style={{ width: `${Math.min(100, progress * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ---------------- the speaker: cone breathes, jewel pulses ---------- */}
        <div
          aria-hidden
          className={`pointer-events-none absolute left-1/2 top-1/2 rounded-full ${playing ? 'cone-pulse' : ''}`}
          style={{
            left: pct(SPEAKER.cx),
            top: pct(SPEAKER.cy),
            width: pct(SPEAKER.d),
            aspectRatio: '1',
            transform: 'translate(-50%,-50%)',
            background: `radial-gradient(circle, rgba(255,216,142,${powered ? 0.14 + level * 0.44 : 0.03}) 0%, rgba(255,176,84,${
              powered ? 0.07 + level * 0.26 : 0.02
            }) 44%, transparent 68%)`,
            mixBlendMode: 'screen',
            transition: 'background .12s linear',
          }}
        />

        <button
          onClick={onPlay}
          disabled={!powered}
          aria-label={playing ? 'Lift the needle (pause)' : 'Drop the needle (play)'}
          title={playing ? 'Pause' : 'Play'}
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full outline-offset-4 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4a3521] disabled:cursor-not-allowed"
          style={{ left: pct(JEWEL.cx), top: pct(JEWEL.cy), width: pct(JEWEL.d), aspectRatio: '1' }}
        >
          <span
            className="absolute inset-0 rounded-full transition-transform duration-200 active:scale-90"
            style={{
              background: powered
                ? 'radial-gradient(circle at 38% 32%, #fff2c8, #ffa336 52%, #b8460a)'
                : 'radial-gradient(circle at 38% 32%, #a8763f, #6b3c12 58%, #351a05)',
              boxShadow: powered
                ? `0 0 ${8 + level * 40}px ${2 + level * 10}px rgba(255,150,50,.75), 0 0 0 1px rgba(90,50,10,.6) inset`
                : '0 0 0 1px rgba(60,34,8,.85) inset, 0 2px 4px rgba(0,0,0,.4)',
              transition: 'box-shadow .12s linear',
            }}
          />
          {powered && (
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[#5c2a00]/75">
              {playing ? <Pause size={9} fill="currentColor" strokeWidth={0} /> : <Play size={9} fill="currentColor" strokeWidth={0} className="translate-x-[6%]" />}
            </span>
          )}
        </button>

        {/* ---------------- the two brass frames: switch + volume ---------------- */}
        <div
          className="absolute"
          style={{ left: pct(POWER_FRAME.left), top: pct(POWER_FRAME.top), width: pct(POWER_FRAME.width), height: pct(POWER_FRAME.height) }}
        >
          {!powered && (
            <span
              aria-hidden
              className="pointer-events-none absolute -inset-[10%] rounded-[10px] ring-2 ring-[#ffe3a6]"
              style={{ animation: 'switch-hint 2.2s ease-in-out infinite' }}
            />
          )}
          <PowerSwitch on={powered} onToggle={onPower} />
        </div>
        <div className="absolute" style={{ left: pct(PLAY_FRAME.left), top: pct(PLAY_FRAME.top), width: pct(PLAY_FRAME.width), height: pct(PLAY_FRAME.height) }}>
          <VolumeDial value={volume} onChange={setVolume} live={powered} />
        </div>
      </div>

      {/* narrow screens: the card is unreadably small, so the deck's essentials
          move into a full-width strip under the cabinet */}
      <div className="mt-2 flex items-center gap-2 rounded-2xl border-2 border-[#d8b077] bg-[#fff8e8]/85 px-2.5 py-2 sm:hidden">
        <button
          onClick={() => onStep(-1)}
          aria-label="Previous record"
          className="rounded-full border-2 border-[#a9773d] bg-[#fff8e8] p-1.5 text-ink"
        >
          <ChevronLeft size={14} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[13px] font-semibold leading-tight text-ink">
            {selected?.short}
          </p>
          <p className="truncate text-[9.5px] font-bold uppercase tracking-[0.12em] text-ink-soft">
            {selected ? `${MODEL_WORD[selected.model] ?? selected.model} · ${index + 1}/${datasets.length}` : ''}
          </p>
        </div>
        <button
          onClick={() => onStep(1)}
          aria-label="Next record"
          className="rounded-full border-2 border-[#a9773d] bg-[#fff8e8] p-1.5 text-ink"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* the caption under the cabinet */}
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="max-w-[62ch] text-[11.5px] font-semibold leading-relaxed text-ink/70">
          {powered ? (
            <>
              <span className="text-ink">Now loaded:</span> {selected?.short}. Throw the disc in from
              the crate, then drop the needle at the speaker&apos;s jewel.
            </>
          ) : (
            <>
              The cabinet is off. <span className="text-ink">Throw the switch</span> — bottom-left
              brass frame — to light the tubes and wake the globe.
            </>
          )}
        </p>
        <p className="font-display text-[10.5px] uppercase tracking-[0.14em] text-ink-soft/85">
          {selected ? `${MODEL_WORD[selected.model] ?? selected.model} · ${selected.sensor}` : ''}
        </p>
      </div>
    </div>
  )
}

/** A knife switch mounted in the cabinet's brass frame. */
function PowerSwitch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={on}
      aria-label={on ? 'Turn the jukebox off' : 'Turn the jukebox on'}
      title={on ? 'Power off' : 'Power on'}
      className="group absolute inset-0 flex items-end justify-center rounded-[6px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream"
    >
      <span className="switch-body absolute inset-[8%] rounded-[5px]" />
      <span className="switch-body absolute inset-x-[26%] bottom-[26%] top-[8%] rounded-[3px] opacity-80" />
      <span
        className={`switch-lever absolute bottom-[30%] left-1/2 h-[42%] w-[26%] -translate-x-1/2 rounded-[2px] ${
          on ? 'switch-lever-on' : 'switch-lever-off'
        }`}
      >
        <span className="absolute inset-x-[30%] top-[6%] h-[16%] rounded-full bg-[#a9834e]/80" />
      </span>
      <span
        className="absolute bottom-[22%] left-1/2 h-[7%] w-[42%] -translate-x-1/2 rounded-full transition"
        style={{
          background: on ? '#ffd47a' : '#5d4526',
          boxShadow: on ? '0 0 8px 2px rgba(255,196,96,.9)' : 'none',
        }}
      />
    </button>
  )
}

/** A brass-topped thumbwheel: drag, scroll or arrow it. */
function VolumeDial({ value, onChange, live }: { value: number; onChange: (v: number) => void; live: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef<{ y: number; v: number } | null>(null)

  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label="Volume"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      onPointerDown={(e) => {
        e.preventDefault()
        drag.current = { y: e.clientY, v: value }
        const move = (ev: PointerEvent) => {
          if (!drag.current) return
          onChange(Math.max(0, Math.min(1, drag.current.v + (drag.current.y - ev.clientY) / 120)))
        }
        const up = () => {
          drag.current = null
          window.removeEventListener('pointermove', move)
          window.removeEventListener('pointerup', up)
        }
        window.addEventListener('pointermove', move)
        window.addEventListener('pointerup', up)
      }}
      onWheel={(e) => {
        e.preventDefault()
        onChange(Math.max(0, Math.min(1, value - Math.sign(e.deltaY) * 0.05)))
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') onChange(Math.max(0, value - 0.05))
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') onChange(Math.min(1, value + 0.05))
      }}
      title={`Volume ${Math.round(value * 100)}%`}
      className="group absolute inset-0 flex cursor-ns-resize items-center justify-center overflow-hidden rounded-[6px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream"
      style={{ background: 'linear-gradient(#e6cfa0, #b28a52 60%, #7d5a30)' }}
    >
      {/* the notched wheel */}
      <span
        className="absolute inset-x-[10%] top-[12%] bottom-[26%] overflow-hidden rounded-[3px]"
        style={{
          background:
            'repeating-linear-gradient(to bottom, #f3e0b6 0 2px, #b89157 2px 4px, #7a5526 4px 5px)',
          boxShadow: '0 2px 5px rgba(0,0,0,.45) inset',
          transform: `translateY(${(1 - value) * 34}%)`,
          transition: 'transform .12s linear',
        }}
      />
      <span className="absolute inset-x-0 bottom-0 h-[18%] bg-[#5a3d1c]/85" />
      <span
        className="absolute bottom-[4%] left-1/2 h-[8%] w-[52%] -translate-x-1/2 rounded-full"
        style={{ background: live ? '#ffd47a' : '#4d3a20', boxShadow: live ? '0 0 7px 2px rgba(255,196,96,.75)' : 'none' }}
      />
    </div>
  )
}
