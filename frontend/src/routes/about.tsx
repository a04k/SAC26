import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Ear, ExternalLink, Eye, Github, Music4, Sparkles, Volume2 } from 'lucide-react'
import { api } from '../lib/api'
import { SCALES } from '../lib/audio/scales'

const MAPPING_ROWS: [string, string, string][] = [
  ['Dominant hue (HSV histogram)', 'Root note & chord color', 'Peaks in the hue histogram map to pitch classes — the Caldwell 73 approach of turning luminosity and position into pitch.'],
  ['Edge density (Canny)', 'Tempo & note density', 'A busy frame plays busier music. Percentage of edge pixels scales the BPM between 56 and 148.'],
  ['Mean luminance', 'Pad brightness & energy', 'Bright frames open the filters and push velocities up.'],
  ['Mean saturation', 'Timbre warmth', 'Saturated frames get a vivid, open sound; muted frames stay dark and filtered.'],
  ['Shannon entropy', 'Harmonic complexity', 'More information in the image means richer chords and more chord tones.'],
  ['8×8 luminance grid', 'Stereo pan & arpeggio order', 'The bright side of the frame becomes the loud side of the headphones.'],
  ['FFT radial profile', 'Percussion & shimmer', 'High-frequency image texture becomes hats, crackle and sparkle.'],
  ['Colorfulness (Hasler–Süsstrunk)', 'Reverb / space', 'Vivid imagery sounds more spacious.'],
  ['Luminance centroid', 'Stereo drift', 'Where the light sits in the frame nudges the melody across the stereo field.'],
]

const STACK = [
  ['Vision', 'Python · OpenCV · NumPy'],
  ['Sonification', 'Custom feature → music ruleset'],
  ['Realtime audio', 'Web Audio API · additive & subtractive synth · convolution reverb'],
  ['Export', 'NumPy additive renderer → 16 s stereo WAV'],
  ['Frontend', 'React 19 · TanStack Router & Query · Zustand · Tailwind v4'],
  ['3D', 'React Three Fiber · Three.js · bloom & vignette postprocessing'],
]

export function AboutPage() {
  const { data } = useQuery({ queryKey: ['datasets'], queryFn: api.datasets })

  return (
    <div className="h-full overflow-y-auto px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl pb-16">
        <header className="mb-8">
          <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-300/70">
            NASA Space Apps Challenge 2026 · The Earth Information Jukebox
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            How sight becomes sound
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/55">
            NASA's Earth Information Center shows us a changing planet — but sight alone
            excludes blind and low-vision audiences and hides patterns the eye skim
            past. Terra Jukebox listens to the data instead. Every pixel of an EIC frame
            is measured by OpenCV, then translated into a musical decision: a root note,
            a tempo, a chord, a stereo position. You orbit a planet that wears the dataset
            as its skin, and hear what the image is doing.
          </p>
        </header>

        <section className="mb-8 grid gap-3 sm:grid-cols-3">
          {[
            ['Accessibility', 'Every track ships with a plain-language description and is announced to screen readers. Controls are keyboard operable; high contrast and reduced-motion modes are one click away.'],
            ['Data fidelity', 'The mapping is not decorative — tempo, note choice and stereo placement are computed from the actual frame. Change the frame and the music changes with it.'],
            ['Musicality', 'Every event is quantized to a scale, chords move I–IV–V–IV, and envelopes are shaped so chaotic data still sounds intentional.'],
          ].map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
              <h2 className="text-sm font-semibold text-white">{title}</h2>
              <p className="mt-1.5 text-[11px] leading-relaxed text-white/45">{body}</p>
            </div>
          ))}
        </section>

        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-white/60">
            <Eye size={14} /> The translation table <ArrowRight size={12} className="text-white/25" />{' '}
            <Volume2 size={14} />
          </h2>
          <div className="overflow-hidden rounded-2xl border border-white/[0.08]">
            <table className="w-full border-collapse text-left text-[11px]">
              <thead>
                <tr className="bg-white/[0.05] text-[9px] uppercase tracking-[0.14em] text-white/40">
                  <th className="px-3 py-2 font-medium">Visual feature (OpenCV)</th>
                  <th className="px-3 py-2 font-medium">Audio parameter</th>
                  <th className="hidden px-3 py-2 font-medium md:table-cell">Why</th>
                </tr>
              </thead>
              <tbody>
                {MAPPING_ROWS.map(([visual, audio, why], i) => (
                  <tr key={visual} className={i % 2 ? 'bg-white/[0.02]' : ''}>
                    <td className="px-3 py-2 text-white/70">{visual}</td>
                    <td className="px-3 py-2 text-cyan-200/90">{audio}</td>
                    <td className="hidden px-3 py-2 leading-relaxed text-white/35 md:table-cell">{why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-8 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
              <Music4 size={14} /> Track recipes
            </h2>
            <ul className="flex flex-col gap-1.5">
              {data?.map((d) => (
                <li key={d.id} className="flex items-center gap-2 text-[11px]">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: d.palette[0] }}
                  />
                  <span className="w-32 shrink-0 truncate text-white/70">{d.short}</span>
                  <span className="truncate text-white/40">
                    {d.instrument_name} · {d.scale_name}
                  </span>
                  <span className="ml-auto shrink-0 font-mono text-[10px] text-white/25">
                    {d.base_tempo}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
              <Sparkles size={14} /> Built with
            </h2>
            <dl className="flex flex-col gap-2">
              {STACK.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[9px] uppercase tracking-[0.14em] text-white/35">{k}</dt>
                  <dd className="text-[11px] text-white/70">{v}</dd>
                </div>
              ))}
            </dl>
            <h3 className="mt-4 mb-1.5 text-[9px] uppercase tracking-[0.14em] text-white/35">
              Scales in the jukebox
            </h3>
            <div className="flex flex-wrap gap-1">
              {Object.entries(SCALES).map(([k, v]) => (
                <span
                  key={k}
                  className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/55"
                >
                  {v.name}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="mb-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
            <Ear size={14} /> Accessibility statement
          </h2>
          <p className="text-[11px] leading-relaxed text-white/50">
            Sonification exists to widen who can read Earth science. This build announces
            track changes and musical descriptions through an ARIA live region, ships a written
            description for every dataset, supports keyboard-only operation (Space to play,
            Tab to move, arrow keys on sliders), and offers high-contrast and reduced-motion
            toggles in the header. The 3D scene is decorative and hidden from assistive tech;
            all information it carries is also present as text and sound.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href="https://svs.gsfc.nasa.gov/gallery/earth-information-center/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-white/12 px-2.5 py-1.5 text-[11px] text-white/60 transition hover:border-white/30 hover:text-white"
            >
              <ExternalLink size={11} /> EIC content database
            </a>
            <a
              href="https://svs.gsfc.nasa.gov/13786/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-white/12 px-2.5 py-1.5 text-[11px] text-white/60 transition hover:border-white/30 hover:text-white"
            >
              <ExternalLink size={11} /> Caldwell 73 sonification
            </a>
            <a
              href="https://www.spaceappschallenge.org/2026/challenges/the-earth-information-jukebox/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-white/12 px-2.5 py-1.5 text-[11px] text-white/60 transition hover:border-white/30 hover:text-white"
            >
              <ExternalLink size={11} /> Challenge brief
            </a>
          </div>
        </section>

        <footer className="flex items-center justify-between border-t border-white/5 pt-4 text-[10px] text-white/25">
          <span>
            EIC visualizations © NASA Scientific Visualization Studio. Procedural frames are
            stand-ins; upload real SVS frames on the Analyze page.
          </span>
          <span className="flex items-center gap-1">
            <Github size={11} /> Terra Jukebox · 2026
          </span>
        </footer>
      </div>
    </div>
  )
}
