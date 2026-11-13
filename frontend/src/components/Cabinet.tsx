import { useMemo } from 'react'
import { Pause, Play } from 'lucide-react'
import { CARD, CRADLE, DOME, GLOBE, JEWEL, SPEAKER, TUBES } from '../lib/geometry'
import { api } from '../lib/api'
import type { Dataset } from '../lib/types'
import { useUI } from '../lib/store'
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
 * The cabinet, standing in the world.
 *
 * The sprite is the supplied painting, cut out of its background so the meadow,
 * sky and weather behind it are *ours* and change with the record. Everything on
 * top of it is light, motion and two physical controls — all positioned from
 * `lib/geometry.ts`, whose fractions were measured on the cut-out itself, so the
 * glass, card and speaker line up at any size.
 */
export function Cabinet({
  datasets,
  selectedId,
  powered,
  playing,
  onPlay,
  onPower,
  level,
  spectrum,
  progress,
  cradleRef,
}: {
  datasets: Dataset[]
  selectedId: string
  powered: boolean
  playing: boolean
  onPlay: () => void
  onPower: () => void
  level: number
  spectrum: number[]
  progress: number
  cradleRef: React.RefObject<HTMLDivElement | null>
}) {
  const selected = datasets.find((d) => d.id === selectedId) ?? datasets[0]
  const volume = useUI((s) => s.volume)
  const setVolume = useUI((s) => s.setVolume)
  const trackNo = Math.max(0, datasets.findIndex((d) => d.id === selected?.id)) + 1

  const bubbles = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => ({
        id: i,
        left: 12 + ((i * 37) % 70),
        delay: -((i * 1.7) % 6),
        dur: 4.6 + ((i * 1.3) % 3),
        size: 2 + ((i * 7) % 3),
      })),
    [],
  )

  // an amber wash on the wooden panel for the two controls
  const keyPlate =
    'absolute rounded-[5px] bg-[linear-gradient(165deg,#fbe7b4,#d0a75f_30%,#9c7130_62%,#6a4a18)] ' +
    'shadow-[0_3px_7px_rgba(0,0,0,.6),0_1px_0_rgba(255,244,210,.65)_inset,0_-1px_0_rgba(40,24,4,.5)_inset] ' +
    'ring-1 ring-[#3d2a12] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fff0c4]'

  return (
    <div className="relative mx-auto w-full" style={{ aspectRatio: '742 / 869' }}>
      {/* the shadow the cabinet casts on the grass */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[8%] bottom-[-1%] h-[7%] rounded-[50%] blur-md"
        style={{ background: 'radial-gradient(closest-side, rgba(24,16,6,.55), transparent 78%)' }}
      />

      {/* halo of light the cabinet throws into the air */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[6%] h-[102%] w-[145%] -translate-x-1/2 rounded-[50%] blur-3xl transition-opacity duration-700"
        style={{
          background: 'radial-gradient(closest-side, rgba(255,190,110,.42), transparent 70%)',
          opacity: powered ? 1 : 0.16,
        }}
      />

      <div className="cabinet-float relative h-full w-full">
        <img
          src="/art/jukebox-cabinet.webp"
          alt="An illustrated wooden jukebox with brass trim, tall amber glass tubes and a silver speaker, standing in a meadow."
          className="block h-full w-full select-none object-contain"
          draggable={false}
          style={{
            filter: powered
              ? 'saturate(1.05) brightness(1.02) drop-shadow(0 22px 26px rgba(20,14,6,.5))'
              : 'saturate(0.62) brightness(0.78) drop-shadow(0 18px 22px rgba(20,14,6,.45))',
            transition: 'filter .8s ease',
          }}
        />

        {/* ---------------- the amber glass tubes ---------------- */}
        {TUBES.map((t, i) => (
          <div
            key={i}
            aria-hidden
            className="absolute overflow-hidden rounded-full"
            style={{
              left: pct(t.left),
              top: pct(t.top),
              width: pct(t.width),
              height: pct(t.height),
              mixBlendMode: 'screen',
            }}
          >
            <div
              className="absolute inset-0 transition-opacity duration-700"
              style={{
                background:
                  'linear-gradient(to bottom, transparent 1%, rgba(255,214,140,.5) 18%, rgba(255,180,86,.62) 60%, rgba(255,150,60,.4) 92%, transparent)',
                opacity: powered ? 0.9 : 0.06,
              }}
            />
            <div
              className="absolute inset-x-0 bottom-0 transition-[height] duration-100"
              style={{
                height: `${8 + Math.min(1, level * 3.2) * 90}%`,
                background:
                  'linear-gradient(to top, rgba(255,252,236,.96), rgba(255,214,128,.9) 38%, rgba(255,148,54,.55))',
                opacity: powered ? 0.95 : 0.1,
                filter: 'blur(1.5px)',
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

        {/* ---------------- the dome: NASA's Earth + spectrum halo ---------------- */}
        <div
          className="absolute"
          style={{
            left: pct(DOME.left),
            top: pct(DOME.top),
            width: pct(DOME.width),
            height: pct(DOME.height),
          }}
        >
          {/*
            The halo is the live analyser, not decoration: one bar per frequency
            band, fanned along the glass arch. With the needle up there is no
            signal, so there is no halo at all.
          */}
          <div aria-hidden className="absolute inset-0 overflow-hidden">
            {playing &&
              spectrum.map((v, i) => {
                const a = -86 + (i / Math.max(1, spectrum.length - 1)) * 172
                return (
                  <span key={i} className="absolute inset-0" style={{ transform: `rotate(${a}deg)` }}>
                    <span
                      className="absolute left-1/2 rounded-full"
                      style={{
                        top: '1%',
                        width: '1%',
                        height: `${7 + v * 26}%`,
                        transform: 'translateX(-50%)',
                        background: `hsla(${32 + v * 46}, 96%, ${62 + v * 16}%, ${0.3 + v * 0.62})`,
                        boxShadow: v > 0.18 ? '0 0 5px rgba(255,214,140,.85)' : 'none',
                      }}
                    />
                  </span>
                )
              })}
          </div>

          {/*
            The record on the turntable, where the globe sits: pick a disc and it
            replaces the Earth in the dome and turns while it plays. When the
            cabinet is off, NASA's Blue Marble is back in the cradle.
          */}
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 transition-[filter] duration-500"
            style={{
              left: pct((GLOBE.cx - DOME.left) / DOME.width),
              top: pct((GLOBE.cy - DOME.top) / DOME.height),
              width: pct((GLOBE.d / DOME.width) * 1.02),
              aspectRatio: '1',
              filter: powered
                ? `drop-shadow(0 0 ${5 + level * 20}px rgba(255,205,150,.95))`
                : 'drop-shadow(0 0 2px rgba(90,120,140,.4)) brightness(.72) saturate(.8)',
            }}
          >
            {powered && selected ? (
              <div className="in-dome h-full w-full">
                <VinylDisc
                  id={selected.id}
                  size={96}
                  spinning={playing}
                  labelUrl={api.frameUrl(selected.id)}
                  title={selected.short}
                  style={{ ['--size' as string]: '100%' }}
                  className="h-full w-full"
                />
              </div>
            ) : (
              <img src="/art/discs/earth.webp" alt="" aria-hidden className="h-full w-full object-contain" />
            )}
          </div>
        </div>

        {/* ---------------- the cradle: the disc that flew in ---------------- */}
        <div
          ref={cradleRef}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          aria-hidden
          style={{ left: pct(0.6206), top: pct(0.2975), width: pct(CRADLE.d * 0.72) }}
        >
          {selected && (
            <div
              className="w-full transition-[filter] duration-400"
              style={{
                transform: 'perspective(320px) rotateX(56deg)',
                filter: powered
                  ? `drop-shadow(0 0 ${3 + level * 16}px rgba(255,190,110,.95))`
                  : 'brightness(.55)',
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

        {/* ---------------- the cream card: what is playing ---------------- */}
        <div
          className="absolute"
          style={{
            left: pct(CARD.left),
            top: pct(CARD.top),
            width: pct(CARD.width),
            height: pct(CARD.height),
          }}
        >
          <div
            className="flex h-full flex-col justify-center gap-[2%] overflow-hidden rounded-[3px] px-[4%] transition-[background,box-shadow] duration-700"
            style={{
              background: powered
                ? 'radial-gradient(120% 130% at 30% 0%, rgba(255,250,226,.97), rgba(255,232,178,.92) 58%, rgba(249,215,152,.9))'
                : 'radial-gradient(120% 130% at 30% 0%, rgba(205,198,182,.72), rgba(176,168,152,.66))',
              boxShadow: powered
                ? '0 0 26px rgba(255,196,102,.4) inset, 0 0 14px rgba(255,180,80,.22)'
                : '0 0 16px rgba(60,44,24,.4) inset',
            }}
          >
            <div className="flex items-baseline justify-between">
              <span className="font-display text-[clamp(6px,.95vw,13px)] font-bold uppercase tracking-[0.16em] text-[#6b4517]">
                A·{String(trackNo).padStart(2, '0')}
              </span>
              <span className="truncate font-display text-[clamp(5px,.7vw,9px)] font-bold uppercase tracking-[0.14em] text-[#8a5f28]">
                {selected ? (MODEL_WORD[selected.model] ?? selected.model) : ''}
              </span>
            </div>
            <p className="truncate font-display text-[clamp(8px,1.4vw,21px)] font-semibold leading-none text-[#3a2716]">
              {selected?.short ?? '—'}
            </p>
            <div className="mt-[3%] flex items-center gap-[3%]">
              <div className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-[#c49a5d99]">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-[#7a4a10]"
                  style={{ width: `${Math.min(100, progress * 100)}%` }}
                />
              </div>
              <span className="font-mono text-[clamp(5px,.6vw,8px)] font-bold uppercase text-[#7a4a10]">
                {playing ? 'play' : powered ? 'ready' : 'off'}
              </span>
            </div>
          </div>
        </div>

        {/* ---------------- speaker: the cone breathes with the signal ------- */}
        <div
          aria-hidden
          className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full ${
            playing ? 'cone-pulse' : ''
          }`}
          style={{
            left: pct(SPEAKER.cx),
            top: pct(SPEAKER.cy),
            width: pct(SPEAKER.d),
            aspectRatio: '1',
            background: `radial-gradient(circle, rgba(255,216,142,${powered ? 0.12 + level * 0.4 : 0.02}) 0%, rgba(255,176,84,${
              powered ? 0.06 + level * 0.22 : 0.015
            }) 42%, transparent 66%)`,
            mixBlendMode: 'screen',
          }}
        />

        {/* the jewel at the centre of the grille: play / pause */}
        <button
          onClick={onPlay}
          disabled={!powered}
          aria-label={playing ? 'Lift the needle (pause)' : 'Drop the needle (play)'}
          title={playing ? 'Pause' : 'Play'}
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#fff0c4] disabled:cursor-not-allowed"
          style={{ left: pct(JEWEL.cx), top: pct(JEWEL.cy), width: pct(JEWEL.d), aspectRatio: '1' }}
        >
          <span
            className="absolute inset-0 rounded-full transition-transform duration-200 active:scale-90"
            style={{
              background: powered
                ? 'radial-gradient(circle at 38% 32%, #fff6d2, #ffab3d 46%, #c14d08 78%, #7d2a03)'
                : 'radial-gradient(circle at 38% 32%, #a8763f, #6b3c12 58%, #351a05)',
              boxShadow: powered
                ? `0 0 ${9 + level * 44}px ${2 + level * 11}px rgba(255,150,50,.75), 0 0 0 1px rgba(90,50,10,.6) inset`
                : '0 0 0 1px rgba(60,34,8,.85) inset, 0 2px 4px rgba(0,0,0,.45)',
            }}
          />
          {powered && (
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[#5c2a00cc]">
              {playing ? (
                <Pause size={12} fill="currentColor" strokeWidth={0} />
              ) : (
                <Play size={12} fill="currentColor" strokeWidth={0} className="translate-x-[6%]" />
              )}
            </span>
          )}
        </button>

        {/* ---------------- the two controls on the wooden panel ------------- */}
        {/* brass power lever, left of the speaker plinth */}
        <button
          onClick={onPower}
          aria-pressed={powered}
          aria-label={powered ? 'Turn the jukebox off' : 'Turn the jukebox on'}
          title={powered ? 'Power off' : 'Power on'}
          className={`${keyPlate} z-20`}
          style={{ left: '19.5%', top: '83.5%', width: '8.6%', height: '9.5%' }}
        >
          <span className="absolute inset-[11%] overflow-hidden rounded-[3px] bg-[linear-gradient(#14100a,#2a2014)] shadow-[inset_0_2px_5px_rgba(0,0,0,.9)]">
            {/* the milled slot */}
            <span className="absolute inset-x-[30%] top-[10%] bottom-[10%] rounded-full bg-[#080604] shadow-[inset_0_0_4px_rgba(0,0,0,1)]" />
            {/* the lever */}
            <span
              className="absolute left-1/2 h-[44%] w-[46%] -translate-x-1/2 rounded-[2px] transition-[top,bottom] duration-500"
              style={{
                top: powered ? '12%' : '46%',
                background: 'linear-gradient(100deg,#fbe7b4,#c9a05a 46%,#7d5520)',
                boxShadow: '0 1px 3px rgba(0,0,0,.85), 0 0 0 1px rgba(60,40,12,.7)',
              }}
            />
            {/* the tell-tale lamp under the lever */}
            <span
              className="absolute bottom-[6%] left-1/2 h-[10%] w-[46%] -translate-x-1/2 rounded-full transition-all duration-500"
              style={{
                background: powered ? '#ffdf9a' : '#4a3a20',
                boxShadow: powered ? '0 0 10px 3px rgba(255,206,120,.95)' : 'none',
              }}
            />
          </span>
        </button>

        {/* brass volume fader, right of the speaker plinth */}
        <div
          role="slider"
          tabIndex={0}
          aria-label="Volume"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(volume * 100)}
          aria-valuetext={`${Math.round(volume * 100)} percent`}
          onWheel={(e) => {
            e.preventDefault()
            setVolume(Math.max(0, Math.min(1, volume - Math.sign(e.deltaY) * 0.05)))
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') setVolume(Math.max(0, volume - 0.05))
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') setVolume(Math.min(1, volume + 0.05))
          }}
          onPointerDown={(e) => {
            e.preventDefault()
            const startY = e.clientY
            const v0 = volume
            const move = (ev: PointerEvent) =>
              setVolume(Math.max(0, Math.min(1, v0 + (startY - ev.clientY) / 140)))
            const up = () => {
              window.removeEventListener('pointermove', move)
              window.removeEventListener('pointerup', up)
            }
            window.addEventListener('pointermove', move)
            window.addEventListener('pointerup', up)
          }}
          title={`Volume ${Math.round(volume * 100)}%`}
          className={`${keyPlate} z-20 cursor-ns-resize`}
          style={{ left: '72%', top: '83.5%', width: '8.6%', height: '9.5%' }}
        >
          <span className="absolute inset-[11%] overflow-hidden rounded-[3px] bg-[linear-gradient(#14100a,#2a2014)] shadow-[inset_0_2px_5px_rgba(0,0,0,.9)]">
            <span className="absolute inset-x-[46%] top-[8%] bottom-[8%] rounded-full bg-[#080604]" />
            <span
              className="absolute left-1/2 h-[16%] w-[66%] -translate-x-1/2 rounded-[2px] transition-[bottom] duration-100"
              style={{
                bottom: `${6 + volume * 70}%`,
                background: 'linear-gradient(#fbe7b4,#c9a05a 50%,#7d5520)',
                boxShadow: '0 1px 3px rgba(0,0,0,.85), 0 0 0 1px rgba(60,40,12,.7)',
              }}
            />
          </span>
        </div>
      </div>
    </div>
  )
}
