"""Catalog of NASA Earth Information Center (EIC) datasets used as jukebox tracks.

Each entry pairs an EIC visualization (Scientific Visualization Studio, SVS)
with a sonification recipe: musical scale, instrument family and the
visual -> audio mapping used by the engine.
"""

from dataclasses import dataclass, asdict


@dataclass(frozen=True)
class Dataset:
    id: str
    title: str
    short: str
    svs_id: str
    svs_url: str
    year_range: str
    description: str
    story: str
    palette: list[str]
    instrument: str
    instrument_name: str
    scale: str
    scale_name: str
    base_tempo: int
    mapping: dict[str, str]
    accessibility: str

    def to_dict(self) -> dict:
        return asdict(self)


DATASETS: list[Dataset] = [
    Dataset(
        id="night-lights",
        title="Change in Night Lights between 2012 and 2023",
        short="Night Lights",
        svs_id="5313",
        svs_url="https://svs.gsfc.nasa.gov/5313/",
        year_range="2012–2023",
        description="Urban illumination across the globe, from near-dark terrain to brilliant city clusters.",
        story="Every bright pixel is a human settlement. The melody follows the brightest clusters — a lullaby sung by cities.",
        palette=["#ffd27a", "#ff9d3c", "#1a2340", "#fff3d6"],
        instrument="pad-pluck",
        instrument_name="Warm pad + pluck",
        scale="major-pentatonic",
        scale_name="Major Pentatonic",
        base_tempo=72,
        mapping={
            "Mean luminance": "Pad brightness & note velocity",
            "Bright clusters (top luminance)": "Melody notes",
            "Edge density": "Rhythm density",
            "Hue warmth": "Filter warmth",
        },
        accessibility="A dark planet dotted with warm golden clusters of light. The sound is a gentle, warm pad with soft plucked notes that follow the brightest cities.",
    ),
    Dataset(
        id="ocean-currents",
        title="Global Sea Surface Currents and Temperature",
        short="Ocean Currents",
        svs_id="3912",
        svs_url="https://svs.gsfc.nasa.gov/3912/",
        year_range="Animation",
        description="Fluid movement of ocean currents alongside thermal gradients across the world's seas.",
        story="Currents never stop. Flowing sine arpeggios trace the swirling water, brightening where the sea is warm.",
        palette=["#22d3ee", "#0ea5e9", "#164e63", "#a5f3fc"],
        instrument="sine-arp",
        instrument_name="Flowing sine arpeggio",
        scale="lydian",
        scale_name="Lydian",
        base_tempo=96,
        mapping={
            "Spatial luminance grid": "Stereo pan & arpeggio order",
            "Mean luminance": "Arpeggio brightness",
            "Edge density": "Flow speed (tempo)",
            "FFT high-frequency band": "Shimmer layer",
        },
        accessibility="Deep blue oceans with bright cyan swirling currents. The sound is a flowing, watery arpeggio that moves from side to side like the currents.",
    ),
    Dataset(
        id="aerosols",
        title="GEOS Aerosols",
        short="GEOS Aerosols",
        svs_id="5669",
        svs_url="https://svs.gsfc.nasa.gov/5669/",
        year_range="Animation",
        description="Smoke, dust and other atmospheric particles tracked by type across the planet.",
        story="Different particle types get different textures — dust hisses, smoke breathes, sea salt sparkles. A multi-track atmosphere.",
        palette=["#fb923c", "#a8a29e", "#60a5fa", "#fde68a"],
        instrument="noise-texture",
        instrument_name="Noise textures",
        scale="dorian",
        scale_name="Dorian",
        base_tempo=84,
        mapping={
            "Colorfulness": "Reverb & space",
            "Saturation": "Noise filter cutoff",
            "Edge density": "Texture density",
            "Dominant colors": "Chord tones",
        },
        accessibility="Clouds of orange dust, grey smoke and blue particles drifting over the planet. The sound is airy and textured, like wind through different kinds of clouds.",
    ),
    Dataset(
        id="air-quality",
        title="Air Quality Model Runs",
        short="Air Quality",
        svs_id="5533",
        svs_url="https://svs.gsfc.nasa.gov/5533/",
        year_range="Model runs",
        description="High-resolution atmospheric model frames: hazy layers of polluted and clean air.",
        story="Haze has a sound: slow, heavy pads that thicken where the air is dirty and thin out where it clears.",
        palette=["#c4b5fd", "#92400e", "#475569", "#e2e8f0"],
        instrument="pad-pluck",
        instrument_name="Hazy pad",
        scale="minor",
        scale_name="Natural Minor",
        base_tempo=68,
        mapping={
            "Mean luminance": "Pad volume",
            "Entropy": "Harmonic complexity",
            "Saturation": "Haze thickness (filter)",
            "Spatial grid": "Slow stereo drift",
        },
        accessibility="A hazy, muted sky with purple and brown layers. The sound is slow and heavy, like breathing through thick air that gradually clears.",
    ),
    Dataset(
        id="perpetual-ocean",
        title="Perpetual Ocean 2: Western Boundary Currents",
        short="Perpetual Ocean",
        svs_id="5425",
        svs_url="https://svs.gsfc.nasa.gov/5425/",
        year_range="Animation",
        description="Major oceanic boundary currents rendered as high-contrast flowing maps.",
        story="The Gulf Stream and its siblings pulse like arteries. A deep heartbeat under a bright, rushing arpeggio.",
        palette=["#38bdf8", "#0369a1", "#082f49", "#e0f2fe"],
        instrument="sine-arp",
        instrument_name="Deep pulse + arp",
        scale="dorian",
        scale_name="Dorian",
        base_tempo=88,
        mapping={
            "Edge density": "Current speed",
            "Luminance": "Pulse depth",
            "Spatial grid": "Arpeggio direction",
            "Hue": "Chord root",
        },
        accessibility="A dark ocean with bright, fast-moving boundary currents. The sound has a deep pulsing heartbeat with bright notes rushing along the currents.",
    ),
    Dataset(
        id="co2",
        title="DYAMOND Global Carbon Dioxide",
        short="Global CO₂",
        svs_id="5196",
        svs_url="https://svs.gsfc.nasa.gov/5196/",
        year_range="Animation",
        description="Global CO₂ concentrations evolving over time — the planet's carbon breath.",
        story="A low, slow drone that swells where CO₂ gathers. The urgency of the data, held in a single sustained breath.",
        palette=["#ef4444", "#f97316", "#facc15", "#450a0a"],
        instrument="drone",
        instrument_name="Low drone",
        scale="minor",
        scale_name="Natural Minor",
        base_tempo=60,
        mapping={
            "Mean luminance": "Drone swell",
            "Entropy": "Chord tension",
            "Saturation": "Heat brightness",
            "Edge density": "Slow pulse",
        },
        accessibility="A dark planet with red and orange heat clouds of carbon dioxide. The sound is a low, slow drone that swells and recedes like a deep breath.",
    ),
    Dataset(
        id="lightning",
        title="Lightning Events Detected from the ISS 2017–2023",
        short="ISS Lightning",
        svs_id="5011",
        svs_url="https://svs.gsfc.nasa.gov/5011/",
        year_range="2017–2023",
        description="Lightning flashes detected from orbit — intricate, layered, punctuated visuals.",
        story="Every bolt is a percussive strike. Sharp, sudden, electric — the sky's own drum kit.",
        palette=["#ffffff", "#67e8f9", "#0e7490", "#164e63"],
        instrument="percussive",
        instrument_name="Percussive strikes",
        scale="hirajoshi",
        scale_name="Hirajōshi",
        base_tempo=120,
        mapping={
            "Edge density": "Strike frequency",
            "FFT high-frequency band": "Crackle layer",
            "Luminance peaks": "Strike velocity",
            "Spatial grid": "Strike pan",
        },
        accessibility="A dark sky split by bright white and cyan lightning bolts. The sound is sharp and percussive, like sudden electric cracks and thunder.",
    ),
    Dataset(
        id="atmospheric-river",
        title="A 3D View of an Atmospheric River",
        short="Atmospheric River",
        svs_id="4960",
        svs_url="https://svs.gsfc.nasa.gov/4960/",
        year_range="3D model",
        description="The path of an atmospheric river — a ribbon of moisture flowing through the sky.",
        story="Moisture density becomes shimmer: a ribbon of sound that widens and brightens as the river carries more water.",
        palette=["#e0f2fe", "#7dd3fc", "#0369a1", "#0c4a6e"],
        instrument="shimmer",
        instrument_name="Shimmer",
        scale="major-pentatonic",
        scale_name="Major Pentatonic",
        base_tempo=80,
        mapping={
            "Luminance": "Shimmer brightness",
            "Spatial grid": "Ribbon direction (pan)",
            "Edge density": "Flow density",
            "Saturation": "Moisture sparkle",
        },
        accessibility="A glowing white ribbon of moisture flowing through a dark sky. The sound is a bright shimmering ribbon of notes flowing from one side to the other.",
    ),
    Dataset(
        id="forest-height",
        title="GEDI Forest Height",
        short="GEDI Forest Height",
        svs_id="4950",
        svs_url="https://svs.gsfc.nasa.gov/4950/",
        year_range="Global map",
        description="Global canopy elevation — color spectrums signify varying forest heights and densities.",
        story="Tall canopy sings high, low scrub sings low. A pentatonic marimba walks up the treeline.",
        palette=["#4ade80", "#16a34a", "#14532d", "#bbf7d0"],
        instrument="marimba",
        instrument_name="Marimba plucks",
        scale="major-pentatonic",
        scale_name="Major Pentatonic",
        base_tempo=76,
        mapping={
            "Luminance (canopy height)": "Pitch height",
            "Saturation": "Pluck brightness",
            "Spatial grid": "Melody contour",
            "Edge density": "Note density",
        },
        accessibility="A green planet covered in forests of different heights. The sound is a gentle marimba melody that rises and falls like the height of the trees.",
    ),
    Dataset(
        id="caldwell-73",
        title="Data Sonification: Caldwell 73",
        short="Caldwell 73",
        svs_id="13786",
        svs_url="https://svs.gsfc.nasa.gov/13786/",
        year_range="Reference",
        description="NASA's reference sonification of deep-space imagery — luminosity and spatial coordinates become volume and pitch.",
        story="The original: starlight translated into tone. Our homage maps the nebula's glow to pitch and its position to stereo space.",
        palette=["#f9a8d4", "#93c5fd", "#312e81", "#fdf4ff"],
        instrument="deep-space",
        instrument_name="Deep-space tones",
        scale="whole-tone",
        scale_name="Whole Tone",
        base_tempo=64,
        mapping={
            "Luminosity": "Pitch & volume",
            "Spatial coordinates": "Stereo position",
            "Hue (pink/blue nebula)": "Scale degree",
            "Entropy": "Harmonic shimmer",
        },
        accessibility="A deep-space nebula in pink and blue with bright stars. The sound is slow, dreamy tones that drift through space, brighter where the stars shine.",
    ),
]

DATASETS_BY_ID: dict[str, Dataset] = {d.id: d for d in DATASETS}
