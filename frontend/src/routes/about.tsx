import { useQuery } from '@tanstack/react-query'
import { ExternalLink } from 'lucide-react'
import { api } from '../lib/api'

const METHOD = [
  {
    n: '01',
    title: 'One real frame per record',
    body: 'Every record is a bundled frame from the published NASA visualization named on its sleeve — Black Marble, ECCO2, MERRA-2, GPM IMERG, Hubble. Nothing is stock, generated, or redrawn. The only picture the app adds is a CSS-drawn disc and a CSS-drawn glow.',
  },
  {
    n: '02',
    title: 'Measure, don’t interpret',
    body: 'Python + OpenCV divides the frame into a 6 × 12 grid and measures each cell: brightness, saturation, hue, Laplacian texture energy, gradient magnitude, and the fraction of hot / green / water / white / dark pixels. No hand-authored melody exists anywhere in the code.',
  },
  {
    n: '03',
    title: 'Give each phenomenon its own physics',
    body: 'A single “brightness → pitch” mapping was the first version, and it was wrong: it made wind sound like a music box. Each record now selects a physical model whose synthesis rules match the process — see below. The spec is declarative, so the browser and the offline renderer produce the same sound.',
  },
  {
    n: '04',
    title: 'Let the ear check the physics',
    body: 'Masking and stream segregation are the failure modes of any parameter-mapped sonification, so redundant mappings are used (wind speed changes both the filter centre and the gust level), pitch stays in the 400–1400 Hz band where equal-loudness contours favour long listening, and loudness is never the only carrier of a value.',
  },
]

const MODELS: [string, string, string][] = [
  ['Wind', 'band-passed noise', 'Air moving past a listener is broadband turbulence shaped by resonances. Centre frequency follows measured turbulence, Q follows gustiness — the standard approach in weather and solar-wind sonification.'],
  ['Storm', 'rain noise + thunder + flashes', 'Dense filtered noise at 1–6 kHz for rain, a low burst with a long decay for thunder, short bright transients for lightning. Cloud brightness sets rain density; texture sharpness sets the strike rate.'],
  ['Fire', 'combustion crackle over a roar', 'Combustion is stochastic impulses at 1–8 kHz over a 20–200 Hz roar. The hot-pixel fraction sets the pop rate, the dark fraction sets the roar.'],
  ['Ocean', 'resonant surges', 'Very low noise bands whose amplitude breathes with the swell, plus a gated whoosh from foam brightness.'],
  ['City lights', 'discrete twinkles', 'Short sine glints whose rate follows light density and whose pitch stays inside the 400–1400 Hz band.'],
  ['Canopy', 'damped resonant pings', 'Forest height sets ping rate and pitch, so the oldest, tallest stands ring lowest.'],
  ['Plume', 'airy transport + sparkles', 'Band-passed beds for air movement with a sparkle layer from the brightest, sharpest pixels.'],
  ['Deep space', 'NASA’s own scan', 'For Caldwell 73 the challenge’s reference method is reproduced: position becomes time along the axis, brightness becomes pitch.'],
]

export function AboutPage() {
  const { data } = useQuery({ queryKey: ['datasets'], queryFn: api.datasets })

  return (
    <div className="mx-auto max-w-[1100px] px-3 pb-10 pt-2 sm:px-5">
      <header className="tt-paper mb-3 p-4 sm:p-6">
        <p className="font-display text-[10px] font-bold uppercase tracking-[0.24em] text-ink-soft">
          NASA Space Apps Challenge 2026 · The Earth Information Jukebox
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
          A jukebox that plays the Earth
        </h1>
        <p className="mt-2 max-w-[68ch] text-[13px] font-semibold leading-relaxed text-ink/80">
          Thirteen records. Each one is a real NASA visualization, measured cell by cell with
          OpenCV, and played back through a physical model of the process it shows — so wind sounds
          like moving air, fire crackles, and a hurricane arrives with rain and thunder. The cabinet
          is the interface; the measurement is the music.
        </p>
      </header>

      <section className="grid gap-2.5 sm:grid-cols-2">
        {METHOD.map((m) => (
          <article key={m.n} className="tt-paper p-3.5">
            <p className="font-mono text-[10px] font-bold tracking-[0.2em] text-[#a2641f]">{m.n}</p>
            <h2 className="mt-0.5 font-display text-[17px] font-semibold text-ink">{m.title}</h2>
            <p className="mt-1 text-[11.5px] leading-relaxed text-ink/80">{m.body}</p>
          </article>
        ))}
      </section>

      <section className="tt-paper mt-3 p-3.5 sm:p-5">
        <h2 className="font-display text-xl font-semibold text-ink">Eight physical models</h2>
        <p className="mt-1 max-w-[70ch] text-[11.5px] leading-relaxed text-ink/75">
          Grounded in the Sonification Handbook (parameter mapping, masking, loudness/pitch
          interaction), NASA&apos;s and the University of Michigan&apos;s solar-wind sonifications, the York
          weather-station pieces, <em>Atmospherics/Weather Works</em>, and Newstadt&apos;s{' '}
          <em>Artificial Soundscapes</em>. The recurring finding across all of them is that timbre and
          filtered noise carry physical identity far better than pitch sequences do.
        </p>
        <div className="mt-2.5 overflow-x-auto">
          <table className="w-full min-w-[640px] border-separate border-spacing-y-1 text-left">
            <thead>
              <tr className="font-display text-[9.5px] uppercase tracking-[0.16em] text-ink-soft">
                <th className="px-2">Model</th>
                <th className="px-2">Synthesis</th>
                <th className="px-2">Why it sounds like that</th>
              </tr>
            </thead>
            <tbody>
              {MODELS.map(([name, synth, why]) => (
                <tr key={name} className="align-top">
                  <td className="w-[14%] rounded-l-lg bg-[#fff8e8]/80 px-2 py-1.5 font-display text-[11.5px] font-bold text-ink">
                    {name}
                  </td>
                  <td className="w-[20%] bg-[#fff8e8]/80 px-2 py-1.5 text-[10.5px] font-semibold text-[#8a5a1c]">
                    {synth}
                  </td>
                  <td className="rounded-r-lg bg-[#fff8e8]/80 px-2 py-1.5 text-[10.5px] leading-relaxed text-ink/80">
                    {why}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="tt-paper mt-3 p-3.5 sm:p-5">
        <h2 className="font-display text-xl font-semibold text-ink">The records</h2>
        <p className="mt-1 text-[11.5px] font-semibold text-ink-soft">
          Each sleeve links to the NASA product it came from. Every frame is bundled in the repo
          with its credit line.
        </p>
        <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {(data ?? []).map((d) => (
            <li key={d.id} className="flex items-start gap-2 rounded-xl border-2 border-[#e2c290]/80 bg-[#fff8e8]/70 p-1.5">
              <img
                src={api.frameUrl(d.id)}
                alt=""
                className="h-11 w-11 shrink-0 rounded-full object-cover ring-1 ring-[#a9773d]"
              />
              <div className="min-w-0">
                <p className="truncate font-display text-[11.5px] font-bold text-ink">{d.short}</p>
                <p className="text-[10px] font-semibold text-ink-soft">
                  {d.svs_id ? `SVS ${d.svs_id}` : 'source page'} · {d.sensor} · {d.model}
                </p>
                {d.svs_url && (
                  <a
                    href={d.svs_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-[#a2641f] hover:text-ink"
                  >
                    <ExternalLink size={9} /> open the source
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="tt-paper mt-3 p-3.5 sm:p-5">
        <h2 className="font-display text-xl font-semibold text-ink">Under the hood</h2>
        <ul className="mt-1.5 grid gap-1 text-[11.5px] text-ink/80 sm:grid-cols-2">
          <li>
            <strong className="text-ink">Measurement</strong> — Python, OpenCV, NumPy; HSV, Laplacian,
            Sobel, colour-fraction masks over a 6 × 12 grid
          </li>
          <li>
            <strong className="text-ink">Models</strong> — declarative specs (filtered-noise beds,
            partials, stochastic bursts) with a documented mapping per process
          </li>
          <li>
            <strong className="text-ink">Browser audio</strong> — Web Audio synthesises the same spec
            live, with an analyser feeding the cabinet&apos;s meters and halo
          </li>
          <li>
            <strong className="text-ink">Offline render</strong> — NumPy one-pole / RBJ filters,
            bursts and normalisation produce the downloadable WAV
          </li>
          <li>
            <strong className="text-ink">Frontend</strong> — React 19, TanStack Router + Query, Tailwind
            v4, Zustand; every control is keyboard operable
          </li>
          <li>
            <strong className="text-ink">Accessibility</strong> — aria-live announcements, high
            contrast, reduced motion, mechanism mute, per-frame text description
          </li>
        </ul>
      </section>
    </div>
  )
}
