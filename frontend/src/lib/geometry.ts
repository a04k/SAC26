/**
 * Overlay geometry for the cabinet sprite.
 *
 * `public/art/jukebox-cabinet.webp` (742 × 869) is the supplied jukebox painting
 * cut out of its meadow with OpenCV (border-colour palette + region grow, then a
 * per-row central run and an analytic arch envelope so the crown and shoulders
 * are clean). Every anchor below was *measured on the cut-out* — HSV masks inside
 * bounded ROIs, largest connected component, plus a Hough pass for the globe — so
 * the live parts land exactly inside the painted glass, card and speaker at any
 * size. Never eyeball these numbers.
 */
export const SPRITE = { w: 742, h: 869, aspect: 742 / 869 }

/** the dark glass of the dome (measured blob: L .2803 T .1507 W .3989 H .2060) */
export const DOME = { left: 0.2803, top: 0.1507, width: 0.3989, height: 0.206 }
/** the painted globe inside the dome — Hough circle, d .1286 of the sprite width */
export const GLOBE = { cx: 0.5007, cy: 0.2468, d: 0.1286 }
/** the record stack on the right shelf of the dome: the disc flight target */
export const STACK = { cx: 0.6206, cy: 0.2975, d: 0.1199 }
/** the blank cream card (measured blob: L .2817 T .458 W .4367 H .1381) */
export const CARD = { left: 0.2817, top: 0.458, width: 0.4367, height: 0.1381 }
/** the amber jewel at the centre of the speaker (measured: L .473 T .794 W .0539 H .046) */
export const JEWEL = { cx: 0.5, cy: 0.817, d: 0.058 }
/** the speaker's dark filigree grille, for the cone pulse and halo bars */
export const GRILLE = { cx: 0.5047, cy: 0.7796, d: 0.4704 }
/** the speaker's outer silver ring (measured blob incl. the arms around it) */
export const SPEAKER = { cx: 0.5047, cy: 0.7796, d: 0.4704 }
/**
 * The glass in the two tall tubes. Each tube is drawn as *two* columns of glass
 * either side of a brass rod, so the lit glass is measured per column
 * (left tube .1429 / .1818, right tube .8100 / .8490; T .475, H ~.41).
 */
export const TUBES = [
  { left: 0.1429, top: 0.475, width: 0.0385, height: 0.409 },
  { left: 0.1818, top: 0.475, width: 0.0385, height: 0.409 },
  { left: 0.81, top: 0.475, width: 0.0385, height: 0.409 },
  { left: 0.849, top: 0.475, width: 0.0385, height: 0.409 },
]
/** the little lift in the middle of the dome shelf, between roller and stack */
export const CRADLE = { cx: 0.5007, cy: 0.2975, d: 0.1199 }
/** the "TERRA TUNES" plate (measured: L .3585 T .3832 W .2871 H .0357) */
export const PLATE = { left: 0.3585, top: 0.3832, width: 0.2871, height: 0.0357 }
/** the plinth, for the contact shadow */
export const BASE_Y = 0.995
/** the wooden panel the controls sit on */
export const PANEL = { left: 0.115, top: 0.85, width: 0.77, height: 0.145 }
