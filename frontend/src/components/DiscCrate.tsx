import type { Dataset } from '../lib/types'
import { api } from '../lib/api'
import { VinylDisc } from './VinylDisc'

const MODEL_WORD: Record<string, string> = {
  wind: 'airflow',
  storm: 'storm',
  fire: 'fire',
  ocean: 'ocean',
  city: 'lights',
  canopy: 'forest',
  plume: 'plume',
  space: 'deep space',
}

/**
 * The crate: the twelve records that are *not* in the cabinet, standing in a
 * wooden box with their grooves catching the light. Choose one and the disc
 * itself lifts and flies into the cradle.
 */
export function DiscCrate({
  datasets,
  selectedId,
  onPick,
  discRefs,
}: {
  datasets: Dataset[]
  selectedId: string
  onPick: (id: string) => void
  discRefs: React.RefObject<Record<string, HTMLButtonElement | null>>
}) {
  const n = datasets.length || 1
  return (
    <section className="mx-auto mt-3.5 w-full max-w-[1180px] px-1" aria-label="Record crate">
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2 px-1">
        <h2 className="font-display text-[15px] font-semibold text-ink">
          The crate{' '}
          <span className="text-[12px] font-normal text-ink-soft/80">
            — pull a disc and it flies into the cabinet
          </span>
        </h2>
        <p className="text-[10.5px] font-semibold text-ink-soft/80">
          each label is a NASA frame · each stamp is the model that reads it
        </p>
      </div>

      <div
        className="relative overflow-x-auto rounded-[20px] border-2 border-[#a9773d] px-3 pb-6 pt-7 shadow-[0_22px_40px_-26px_rgba(61,38,12,.9)]"
        style={{ background: 'linear-gradient(#b9854a, #a5703a 22%, #8c5b2c 70%, #6f4620 100%)' }}
      >
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-4 rounded-b-[18px] bg-gradient-to-b from-[#8a5a2c] to-[#6a441f] shadow-[0_-2px_0_rgba(255,225,170,.25)_inset]" />
        <div className="flex min-w-max items-end gap-1 px-1">
          {datasets.map((d, i) => {
            const active = d.id === selectedId
            const tilt = (i - (n - 1) / 2) * 0.6
            return (
              <button
                key={d.id}
                ref={(el) => {
                  discRefs.current[d.id] = el
                }}
                onClick={() => onPick(d.id)}
                aria-label={`Record ${i + 1}: ${d.short}, ${MODEL_WORD[d.model] ?? d.model}`}
                aria-pressed={active}
                className="group relative shrink-0 rounded-full transition-transform duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#fff3cf]"
                style={{ transform: active ? 'translateY(-14px)' : undefined }}
              >
                <span
                  className="block transition-transform duration-300 group-hover:-translate-y-3"
                  style={{ transform: `rotate(${tilt}deg)` }}
                >
                  <span className="relative block">
                    <VinylDisc
                      id={d.id}
                      size={92}
                      labelUrl={api.frameUrl(d.id)}
                      title={d.short}
                      style={{
                        filter: active
                          ? 'drop-shadow(0 0 10px rgba(255,208,120,.9)) drop-shadow(0 8px 10px rgba(40,24,6,.7))'
                          : 'drop-shadow(0 6px 8px rgba(40,24,6,.6))',
                      }}
                    />
                    {active && <span className="pointer-events-none absolute -inset-1 rounded-full ring-2 ring-[#ffe3a6]" />}
                  </span>
                </span>
                <span
                  className={`mt-1.5 block w-[92px] truncate text-center font-display text-[9.5px] font-bold uppercase tracking-wider ${
                    active ? 'text-[#fff3cf]' : 'text-[#3a2510]/85'
                  }`}
                >
                  {d.short}
                </span>
                <span
                  className={`block w-[92px] truncate text-center text-[8px] font-semibold uppercase tracking-[0.12em] ${
                    active ? 'text-[#ffe3a6]/95' : 'text-[#3a2510]/60'
                  }`}
                >
                  {MODEL_WORD[d.model] ?? d.model}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
