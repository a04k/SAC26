"""Phenomenon-specific synthesis.

The measurement is shared (`app/analysis.py`): a frame is divided into a grid
and every cell yields a set of physically meaningful quantities. What differs
is the *synthesis model* — the thing that decides which sound a measurement
becomes:

  wind      flowing, band-passed noise beds        (filtered noise wind)
  storm     swirling beds + rain + thunder/clicks  (weather)
  fire      crackle transients + low rumble        (combustion)
  ocean     surges                           (water)
  city      twinkling lights                 (settlements)
  canopy    resonant pings                   (forest)
  plume     airy bands + sparkle             (atmospheric transport)
  space     NASA's star-scan method                (position -> pitch)

Every model is a *physical* model rather than a musical one: filtered noise is
wind because airflow is broadband turbulence shaped by resonances, and a fire
crackles because combustion pops. No scale, tempo, chord or reverb is imposed
by the sonifier — the mapping tables in `MODELS` are the contract, and every
one is documented in the app.

All models return a descriptive spec (JSON) which the frontend reproduces with
WebAudio in real time; `render.py` performs the same synthesis offline with
NumPy, so the downloaded WAV and the live sound come from one set of rules.
"""

from .models import MODELS, build_spec, model_for  # noqa: F401
from .render import render_spec_wav  # noqa: F401
