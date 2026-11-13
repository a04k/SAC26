import { ExternalLink, Music2 } from 'lucide-react'
import { useUI } from '../lib/store'
import { api } from '../lib/api'
import type { Dataset } from '../lib/types'

export function TrackLibrary({ datasets }: { datasets: Dataset[] }) {
  const { selectedId, select, announce, isPlaying } = useUI()

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between px-1">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
          The Jukebox · {datasets.length} tracks
        </h2>
        <span className="flex items-center gap-1 text-[10px] text-white/30">
          <Music2 size={10} /> NASA EIC / SVS
        </span>
      </div>
      <ul className="flex max-h-[26vh] flex-col gap-1.5 overflow-y-auto pr-1 sm:max-h-[38vh] lg:max-h-[calc(100vh-19rem)]">
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
                className={`group flex w-full items-center gap-2.5 rounded-xl border p-2 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                  active
                    ? 'border-white/25 bg-white/10'
                    : 'border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.06]'
                }`}
              >
                <span className="w-5 shrink-0 text-center font-mono text-[10px] text-white/25">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <img
                  src={api.frameUrl(d.id)}
                  alt=""
                  loading="lazy"
                  className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-white/10"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[12px] font-medium text-white">{d.short}</span>
                    {active && isPlaying && (
                      <span className="flex h-2.5 items-end gap-[1.5px]" aria-hidden>
                        {[0, 1, 2].map((k) => (
                          <span
                            key={k}
                            className="w-[2px] animate-pulse rounded-sm"
                            style={{
                              height: `${5 + k * 3}px`,
                              background: d.palette[0],
                              animationDelay: `${k * 120}ms`,
                            }}
                          />
                        ))}
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-[10px] text-white/40">
                    {d.instrument_name} · {d.scale_name}
                  </span>
                </span>
                <a
                  href={d.svs_url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 rounded p-1 text-white/25 opacity-0 transition hover:text-white focus-visible:opacity-100 group-hover:opacity-100"
                  aria-label={`Open SVS ${d.svs_id} source for ${d.short}`}
                >
                  <ExternalLink size={12} />
                </a>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
