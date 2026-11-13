export const NOTE_NAMES = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
] as const

export const NOTE_TO_PC: Record<string, number> = {
  C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5,
  'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11,
}

export const SCALES: Record<string, { name: string; steps: number[] }> = {
  'major-pentatonic': { name: 'Major Pentatonic', steps: [0, 2, 4, 7, 9] },
  'minor-pentatonic': { name: 'Minor Pentatonic', steps: [0, 3, 5, 7, 10] },
  dorian: { name: 'Dorian', steps: [0, 2, 3, 5, 7, 9, 10] },
  lydian: { name: 'Lydian', steps: [0, 2, 4, 6, 7, 9, 11] },
  major: { name: 'Major', steps: [0, 2, 4, 5, 7, 9, 11] },
  minor: { name: 'Natural Minor', steps: [0, 2, 3, 5, 7, 8, 10] },
  hirajoshi: { name: 'Hirajōshi', steps: [0, 2, 3, 7, 8] },
  'whole-tone': { name: 'Whole Tone', steps: [0, 2, 4, 6, 8, 10] },
}

export const midiToFreq = (m: number) => 440 * 2 ** ((m - 69) / 12)

/** Musical scale degree -> MIDI note, relative to a root pitch class. */
export function scaleMidi(
  rootPc: number,
  scale: string,
  degree: number,
  octave: number,
): number {
  const steps = (SCALES[scale] ?? SCALES['major-pentatonic']).steps
  const n = steps.length
  const idx = ((degree % n) + n) % n
  const oct = Math.floor(degree / n)
  return 48 + rootPc + steps[idx] + 12 * (octave + oct)
}
