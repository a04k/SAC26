import { useQuery } from '@tanstack/react-query'
import { ExternalLink } from 'lucide-react'
import { api } from '../lib/api'

const METHOD = [
  {
    n: '01',
    title: 'One real frame per record',
    body: 'Every record is a bundled frame from the published NASA visualization named on its sleeve — Black Marble, ECCO2, GEOS, GPM IMERG, Caldwell 73. Nothing on the jukebox, the disc labels or the analysis view is stock or redrawn. The painted backdrops behind the cabinet are illustration, and are credited as such; the data frames are never generated.',
  },
  {
    n: '02',
    title: 'Measure, don’t interpret',
    body: 'Python + OpenCV divides the frame into a 6 × 12 grid and measures every cell: brightness, saturation, hue, Laplacian texture energy, gradient magnitude, and the fraction of hot / green / water / white / dark pixels. Each cell also gets a relative brightness against the frame’s own bright end, so a starfield is not silent just because space is black.',
  },
  {
    n: '03',
    title: 'Give each phenomenon its own physical model',
    body: 'There is no shared oscillator bank. Each record runs a different mechanism: turbulence for air, an impact train of individual droplets for rain, damped modal resonators for fire and canopy, swelling bands for water, and Caldwell’s own scan for the space frame. The spec is declarative, so the browser and the offline renderer run the same rules.',
  },
  {
    n: '04',
    title: 'Let the ear check the physics',
    body: 'Masking and stream segregation are the failure modes of parameter-mapped sonification, so redundant mappings are used (gust speed moves both the band centre and the gust level), it stays in the frequency range the ear is most sensitive to over long listening, loudness is never the only carrier of a value, and every impact keeps its own stereo position.',
  },
]

const MODELS: [string, string, string][] = [
  ['Wind', 'turbulence + gust envelope', 'Air moving past a listener is broadband turbulence shaped by the space around it. A von-Karman-ish gust envelope drives a glottal-style turbulence generator through a moving band-pass, so each row of the frame becomes one gust: its speed sets the band the wind howls in, its texture sets how hard it hits, and a thin whistle appears in the strongest row.'],
  ['Storm', 'individual raindrops + thunder', 'Rain is not a hiss. It is thousands of separate drops striking leaves and water, each a short resonance of 0.6–5 kHz decaying in about 12 ms. Bright cloud makes more of them, texture shifts their pitch, and thick dark cloud adds thunder: a bright crack with a rumble whose decay follows the cloud’s mass.'],
  ['Fire', 'combustion crackle over a roar', 'Crackle is thousands of tiny implosions of sap and air — Poisson impulses through a damped resonator bank 1–8 kHz — over a low roar whose cutoff follows the flame area, plus a slow breath from the smoke plume. The hot-pixel fraction sets the crackle rate.'],
  ['Ocean', 'swell, foam and water mass', 'A sub-bass bed for the mass of the sea, band-passed swells whose period comes from the measured gradient of the surf line, and brief bright hisses where the foam breaks.'],
  ['City lights', 'discrete glints', 'Light is discrete, so each bright cell emits a damped glint. Pitch stays in the 420–1380 Hz band where the ear is most sensitive, and the panning follows the map.'],
  ['Canopy', 'modal pings', 'A forest canopy is a resonant structure: each dense green cell is struck and rings at a pitch set by how textured it is, with three partials at independent decays.'],
  ['Plume', 'transport beds + sparkle', 'A deep bed for the mass being carried, a moving band for the transport, and brief sparkles where the edge of the cloud is sharpest against the dark.'],
  ['Deep space', 'Caldwell’s own scan', 'For Caldwell 73 the challenge’s reference method is reproduced: left to right is time along the scan axis, brightness is pitch, and vertical position is where the sound sits in the stereo image.'],
]

export function AboutPage() {
  const { data } = useQuery({ queryKey: ['datasets'], queryFn: api.datasets })

  return (
    <div className="mx-auto max-w-[1100px] px-3 pb-12 pt-2 sm:px-5">
      <header className="tt-paper mb-3 p-4 sm:p-6">
        <p className="font-display text-[10px] font-bold uppercase tracking-[0.24em] text-ink-soft">
          NASA Space Apps Challenge 2026 · The Earth Information Jukebox
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
          A jukebox that plays the Earth
        </h1>
        <p className="mt-2 max-w-[68ch] text-[13px] font-semibold leading-relaxed text-[#3a2a18cc]">
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
            <p className="mt-1 text-[11.5px] leading-relaxed text-[#3a2a18cc]">{m.body}</p>
          </article>
        ))}
      </section>

      <section className="tt-paper mt-3 p-3.5 sm:p-5">
        <h2 className="font-display text-xl font-semibold text-ink">Eight physical models</h2>
        <p className="mt-1 max-w-[70ch] text-[11.5px] leading-relaxed text-[#3a2a18bf]">
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
                  <td className="w-[14%] rounded-l-lg bg-[#fff8e8cc] px-2 py-1.5 font-display text-[11.5px] font-bold text-ink">
                    {name}
                  </td>
                  <td className="w-[20%] bg-[#fff8e8cc] px-2 py-1.5 text-[10.5px] font-semibold text-[#8a5a1c]">
                    {synth}
                  </td>
                  <td className="rounded-r-lg bg-[#fff8e8cc] px-2 py-1.5 text-[10.5px] leading-relaxed text-[#3a2a18cc]">
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
            <li key={d.id} className="flex items-start gap-2 rounded-xl border-2 border-[#e2c290cc] bg-[#fff8e8b2] p-1.5">
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
        <ul className="mt-1.5 grid gap-1 text-[11.5px] text-[#3a2a18cc] sm:grid-cols-2">
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
