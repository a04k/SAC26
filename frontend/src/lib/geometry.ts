/**
 * Overlay geometry, measured with OpenCV from `public/art/jukebox.webp`
 * (1920 × 1071) so DOM controls sit exactly inside the painted chrome. All
 * values are fractions of the artwork's own width/height, which is rendered
 * `width: 100%` at its native aspect ratio, so they hold at any size.
 *
 * The painting is unlit: the app adds every lamp, glow and moving part.
 */
export const ART = { w: 1920, h: 1071, aspect: 1920 / 1071 }

/** the dark glass of the dome */
export const DOME = { left: 0.4, top: 0.139, width: 0.195, height: 0.201 }
/** the globe painted in the dome (measured blue disc): centre + diameter */
export const GLOBE = { cx: 0.4992, cy: 0.254, d: 0.0497 }
/** the blank cream card: the record list lives here */
export const CARD = { left: 0.4205, top: 0.4335, width: 0.1524, height: 0.0685 }
/** the amber jewel at the centre of the speaker */
export const JEWEL = { cx: 0.4962, cy: 0.7005, d: 0.021 }
/** the speaker's silver ring (patterned grille) */
export const SPEAKER = { cx: 0.5, cy: 0.7, d: 0.141 }
/** the two glass tubes, inner glass */
export const TUBES = [
  { left: 0.3661, top: 0.4314, width: 0.0182, height: 0.3315 },
  { left: 0.6156, top: 0.4314, width: 0.0182, height: 0.3315 },
]
/** the shallow cradle on the right-hand record stack, seen lying flat */
export const CRADLE = { cx: 0.5595, cy: 0.3025, d: 0.052 }
/** the two brass corner brackets flanking the speaker: the machine's controls */
export const POWER_FRAME = { left: 0.386, top: 0.762, width: 0.0535, height: 0.078 }
export const PLAY_FRAME = { left: 0.5605, top: 0.762, width: 0.0535, height: 0.078 }
