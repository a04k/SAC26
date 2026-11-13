import { ExternalLink } from 'lucide-react'
import { useUI } from '../lib/store'
import { api } from '../lib/api'
import type { Dataset } from '../lib/types'

export function TrackLibrary({ datasets }: { datasets: Dataset[] }) {
  const { selectedId, select, announce, isPlaying } = useUI()

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between px-0.5">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
          EIC tracks · {datasets.length}
        </h2>
        <span className="font-mono text-[9px] text-white/25">NASA SVS</span>
      </div>
      <ul className="flex max-h-[24vh] flex-col gap-1 overflow-y-auto pr-1 sm:max-h-[34vh] lg:max-h-[calc(100vh-24rem)]">
        {datasets.map((d, i) => {
          const active = d.id === selectedId
          return (
            <li key={d.id}>
              <button
                onClick={() => {
                  select(d.id)
                  announce(`Loaded ${d.short}. ${d.accessibility}`)
                }}
                aria-current={active ? 'true' : undefined}
                className={`group flex w-full items-center gap-2 rounded-lg border p-1.5 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                  active
                    ? 'border-white/25 bg-white/10'
                    : 'border-white/[0.04] bg-white/[0.015] hover:border-white/15 hover:bg-white/[0.05]'
                }`}
              >
                <span className="w-4 shrink-0 text-center font-mono text-[9px] text-white/25">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <img
                  src={api.frameUrl(d.id)}
                  alt=""
                  loading="lazy"
                  className="h-8 w-12 shrink-0 rounded object-cover ring-1 ring-white/10"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[11.5px] font-medium text-white">{d.short}</span>
                    {active && isPlaying && (
                      <span className="flex h-2 items-end gap-[1.5px]" aria-hidden>
                        {[0, 1, 2].map((k) => (
                          <span
                            key={k}
                            className="w-[2px] animate-pulse rounded-sm bg-cyan-300"
                            style={{ height: `${4 + k * 2}px`, animationDelay: `${k * 140}ms` }}
                          />
                        ))}
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-[9px] text-white/35">
                    {d.sensor} · SVS {d.svs_id}
                  </span>
                </span>
                <a
                  href={d.svs_url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 rounded p-0.5 text-white/20 transition hover:text-white group-hover:text-white/50"
                  aria-label={`Open the NASA SVS source page ${d.svs_id} for ${d.short}`}
                >
                  <ExternalLink size={10} />
                </a>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
