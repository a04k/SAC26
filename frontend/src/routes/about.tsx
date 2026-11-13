import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Ear, ExternalLink, Eye, Ruler, ScanLine, Volume2 } from 'lucide-react'
import { api } from '../lib/api'

const MAPPING: [string, string, string][] = [
  [
    'Band brightness (0–1, per-frame 2–98 percentile)',
    'Pitch: 110 Hz × 2^(n/12), n = 0…30',
    'Linear across 2.5 octaves. Neighbouring brightness → neighbouring pitch. Nothing is snapped to a scale.',
  ],
  [
    'Brightness × edge density × texture energy',
    'Amplitude of that band’s tone',
    'The relative loudness of every row is exactly the measured ratio; one uniform gain keeps the file in range.',
  ],
  [
    'Laplacian texture energy',
    'Noise layer mixed into the tone',
    'Busy, high-frequency regions (city grids, lightning fields, canopy) sound gritty; smooth fields stay pure.',
  ],
  [
    'Mean hue of the band',
    'Stereo position',
    'Red/magenta → left, cyan/green → right. You can hear which aerosol species, or which side of a current, you are in.',
  ],
  [
    'Four sampled columns per band',
    'Four short notes',
    'The melody is four pixel values read left to right — the same order you would read the image.',
  ],
  [
    'Frame order, top to bottom',
    'Time order of the scan',
    'Band 1 is 90°N, band 24 is 90°S. The piece runs north → south in one pass, like NASA’s own sonifications.',
  ],
  [
    'Mean brightness of each series frame',
    'One sustained tone per year',
    'For night lights, 2012 and 2023 are separate real frames, so you hear the decade rise (and the difference frame).',
  ],
]

const STACK = [
  ['Frame ingestion', 'Bundled real NASA frames (assets/frames) — no synthetic imagery'],
  ['Measurement', 'Python · OpenCV — band means, Canny, Laplacian, HSV'],
  ['Sonification', 'Direct parameter mapping in app/scan.py — no composition layer'],
  ['Realtime audio', 'Web Audio: one oscillator per measured tone, noise layer from measured texture'],
  ['Export', 'NumPy renderer → 44.1 kHz stereo WAV of the same scan'],
  ['Frontend', 'React 19 · TanStack Router & Query · React Three Fiber · Tailwind v4'],
]

export function AboutPage() {
  const { data } = useQuery({ queryKey: ['datasets'], queryFn: api.datasets })

  return (
    <div className="h-full overflow-y-auto px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-4xl pb-14">
        <header className="mb-7">
          <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300/70">
            NASA Space Apps Challenge 2026 · The Earth Information Jukebox
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
            Every tone is a measurement
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/55">
            This build deliberately contains <strong className="text-white/80">no music generator</strong>.
            There is no tempo grid, no scale, no chord progression, no reverb. A frame is measured
            row by row with OpenCV, and each measurement is turned into exactly one audio parameter
            by a fixed, inspectable rule. If the number changes, the sound changes; if the number
            does not, the sound does not.
          </p>
        </header>

        <section className="mb-7 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
            <ScanLine size={14} /> How a frame is read
          </h2>
          <ol className="flex flex-col gap-1.5 text-[11px] leading-relaxed text-white/55">
            <li>
              <span className="font-mono text-cyan-200/80">1.</span> The frame is split into 24
              horizontal bands — 90°N to 90°S on map products.
            </li>
            <li>
              <span className="font-mono text-cyan-200/80">2.</span> Each band yields brightness,
              saturation, mean hue, Canny edge density, Laplacian texture energy, and four sampled
              columns.
            </li>
            <li>
              <span className="font-mono text-cyan-200/80">3.</span> Brightness is normalised to the
              frame’s own 2nd–98th percentile — so a map on white and a night map on black land in
              the same register and remain comparable track to track.
            </li>
            <li>
              <span className="font-mono text-cyan-200/80">4.</span> Those numbers become pitch,
              loudness, noise and pan. One pass, north to south, 24 seconds by default.
            </li>
          </ol>
        </section>

        <section className="mb-7">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-white/55">
            <Eye size={13} /> Measured <ArrowRight size={11} className="text-white/25" /> audible <Volume2 size={13} />
          </h2>
          <div className="overflow-hidden rounded-2xl border border-white/[0.08]">
            <table className="w-full border-collapse text-left text-[11px]">
              <thead>
                <tr className="bg-white/[0.05] text-[9px] uppercase tracking-[0.12em] text-white/40">
                  <th className="px-3 py-2 font-medium">Measured by OpenCV</th>
                  <th className="px-3 py-2 font-medium">Audio parameter</th>
                  <th className="hidden px-3 py-2 font-medium md:table-cell">Rule</th>
                </tr>
              </thead>
              <tbody>
                {MAPPING.map(([m, a, why], i) => (
                  <tr key={m} className={i % 2 ? 'bg-white/[0.02]' : ''}>
                    <td className="px-3 py-2 align-top text-white/70">{m}</td>
                    <td className="px-3 py-2 align-top text-cyan-200/90">{a}</td>
                    <td className="hidden px-3 py-2 align-top leading-relaxed text-white/35 md:table-cell">{why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-7 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
              <Ruler size={13} /> Ten real datasets
            </h2>
            <ul className="flex flex-col gap-1.5">
              {data?.map((d) => (
                <li key={d.id} className="flex items-baseline gap-2 text-[10.5px]">
                  <span className="w-28 shrink-0 truncate text-white/70">{d.short}</span>
                  <span className="truncate text-white/35">{d.sensor}</span>
                  <span className="ml-auto shrink-0 font-mono text-[9px] text-white/25">SVS {d.svs_id}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
            <h2 className="mb-2 text-sm font-semibold text-white">What is not in the signal path</h2>
            <ul className="flex flex-col gap-1 text-[10.5px] leading-relaxed text-white/50">
              {[
                'Tempo / beat grid',
                'Musical scales or keys',
                'Chord progressions',
                'Reverb, delay, chorus',
                'Per-track “instruments”',
                'Any random or procedural visual',
              ].map((x) => (
                <li key={x} className="flex items-start gap-1.5">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-red-400/70" />
                  {x}
                </li>
              ))}
            </ul>
            <h3 className="mt-3 mb-1 text-[9px] uppercase tracking-[0.14em] text-white/35">Built with</h3>
            <dl className="flex flex-col gap-1">
              {STACK.map(([k, v]) => (
                <div key={k} className="text-[10px]">
                  <dt className="inline text-white/35">{k}: </dt>
                  <dd className="inline text-white/70">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
            <Ear size={13} /> Accessibility
          </h2>
          <p className="text-[11px] leading-relaxed text-white/50">
            Each track announces its sound in words (bright rows high and loud, dark rows low and
            quiet) through an ARIA live region, every dataset has a written description of both the
            image and its sound, the transport is fully keyboard operable (Space, ←/→), and the 3D
            scene is decorative and hidden from assistive technology — the source frame, the measured
            band table and the audio carry all the information.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href="https://svs.gsfc.nasa.gov/gallery/earth-information-center/" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-lg border border-white/12 px-2.5 py-1.5 text-[10.5px] text-white/60 transition hover:border-white/30 hover:text-white">
              <ExternalLink size={10} /> EIC content database
            </a>
            <a href="https://svs.gsfc.nasa.gov/13786/" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-lg border border-white/12 px-2.5 py-1.5 text-[10.5px] text-white/60 transition hover:border-white/30 hover:text-white">
              <ExternalLink size={10} /> Caldwell 73 sonification (method reference)
            </a>
            <a href="https://www.spaceappschallenge.org/2026/challenges/the-earth-information-jukebox/" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-lg border border-white/12 px-2.5 py-1.5 text-[10.5px] text-white/60 transition hover:border-white/30 hover:text-white">
              <ExternalLink size={10} /> Challenge brief
            </a>
          </div>
        </section>

        <footer className="border-t border-white/5 pt-3 text-[10px] leading-relaxed text-white/25">
          Frames © NASA Scientific Visualization Studio, NASA Earth Observatory, NASA GMAO and
          NASA/ESA Hubble — per-track credits are shown in the Source panel of each track.
        </footer>
      </div>
    </div>
  )
}
