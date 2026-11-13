"""Catalog of Earth Information Center (EIC) datasets used as jukebox tracks.

Every entry names the real SVS product it comes from, the exact source frame
bundled in `assets/frames/`, its credit line, and the *measured* sonification
mapping (no musical interpretation). `series` lists real frames that form a
time series, when the published product provides one.
"""

from dataclasses import asdict, dataclass


@dataclass(frozen=True)
class Dataset:
    id: str
    title: str
    short: str
    svs_id: str
    svs_url: str
    year_range: str
    source_frame: str
    credit: str
    dataset_name: str
    sensor: str
    description: str
    accessibility: str
    series: tuple[tuple[str, str], ...] = ()
    element: str = "earth"   # storms | wind | fire | ice | ocean | land

    def to_dict(self) -> dict:
        d = asdict(self)
        d["series"] = [{"asset": a, "label": l} for a, l in self.series]
        return d


DATASETS: list[Dataset] = [
    Dataset(
        id="night-lights",
        title="Change in Night Lights between 2012 and 2023 — EIC Version",
        short="Night Lights",
        svs_id="5313",
        svs_url="https://svs.gsfc.nasa.gov/5313/",
        year_range="2012–2023",
        source_frame="Black Marble annual nighttime-lights map, 2023 (EIC flat map)",
        credit="NASA SVS / NASA Earth Observatory (Joshua Stevens), Suomi NPP VIIRS Black Marble",
        dataset_name="Black Marble: Next Generation",
        sensor="Suomi NPP · VIIRS",
        description=(
            "Annual average nighttime lights for 2023, equirectangular. Bright clusters are "
            "cities; the dark ocean and unlit land stay near black and near silence."
        ),
        accessibility=(
            "A black map of the world. Golden clusters mark cities — eastern China, India, "
            "Europe, the US east coast glow brightest. The scan moves from the Arctic down to "
            "Antarctica; each row of the map becomes one sustained tone, bright rows high and "
            "loud, dark ocean rows low and nearly silent."
        ),
        series=(
            ("night-lights-2012", "2012"),
            ("night-lights", "2023 average"),
            ("night-lights-2023", "2012→2023 change"),
        ),
        element="land",
    ),
    Dataset(
        id="ocean-currents",
        title="Global Sea Surface Currents and Temperature",
        short="Ocean Currents",
        svs_id="3912",
        svs_url="https://svs.gsfc.nasa.gov/3912/",
        year_range="Animation",
        source_frame="Global sea surface currents coloured by temperature",
        credit="NASA SVS / MITgcm ECCO2 state estimate (NASA/JPL) with Scientific Visualization Studio",
        dataset_name="ECCO2 ocean state estimate",
        sensor="Model · MITgcm ECCO2",
        description=(
            "Sea surface temperature as colour with white current streamlines. Warm tropics "
            "sit bright orange/red, cold high latitudes deep blue."
        ),
        accessibility=(
            "A world ocean map in bands of blue to red with fine white current lines. The "
            "warm equatorial rows are high and bright, polar rows low and quiet, and the "
            "white streamlines add a steady hiss wherever the currents are dense."
        ),
        element="ocean",
    ),
    Dataset(
        id="aerosols",
        title="GEOS Aerosols",
        short="GEOS Aerosols",
        svs_id="5669",
        svs_url="https://svs.gsfc.nasa.gov/5669/",
        year_range="Animation",
        source_frame="GEOS aerosol optical depth by species (dust, smoke, sea salt, sulfate)",
        credit="NASA SVS / NASA GMAO GEOS composition model",
        dataset_name="GEOS-FP aerosol fields",
        sensor="Model · GEOS-5 / GEOS-FP",
        description=(
            "Dust, smoke, sea salt and sulfate plumes coloured by species. Colour hue tells "
            "you which aerosol dominates a region, and it drives stereo position here."
        ),
        accessibility=(
            "Swirling plumes of orange dust, white smoke and green sulfate over a grey world. "
            "Tone pitch follows brightness; the panning follows colour, so dust leans to one "
            "ear and smoke to the other, and you can hear where each species sits."
        ),
        element="wind",
    ),
    Dataset(
        id="air-quality",
        title="Air Quality Model Runs",
        short="Air Quality",
        svs_id="5533",
        svs_url="https://svs.gsfc.nasa.gov/5533/",
        year_range="Model runs",
        source_frame="GEOS-CF near-surface carbon monoxide forecast map",
        credit="NASA SVS / NASA GMAO GEOS Composition Forecast (GEOS-CF)",
        dataset_name="GEOS-CF composition forecast",
        sensor="Model · GEOS-CF",
        description=(
            "Modelled surface carbon monoxide as a global concentration field. Purple and "
            "bright regions carry high CO; grey regions are clean air."
        ),
        accessibility=(
            "A violet and grey world map showing polluted and clean air. The scan is slow and "
            "the palette is narrow, so the sound stays in a small pitch band — the change is "
            "in loudness, not melody."
        ),
        element="wind",
    ),
    Dataset(
        id="perpetual-ocean",
        title="Perpetual Ocean 2: Western Boundary Currents",
        short="Perpetual Ocean",
        svs_id="5425",
        svs_url="https://svs.gsfc.nasa.gov/5425/",
        year_range="Animation",
        source_frame="Western boundary currents, surface speed fields",
        credit="NASA SVS / ECCO2 ocean state estimate (NASA/JPL)",
        dataset_name="ECCO2 ocean currents",
        sensor="Model · MITgcm ECCO2",
        description=(
            "High-contrast surface current maps: bright filaments are fast-moving boundary "
            "currents such as the Gulf Stream."
        ),
        accessibility=(
            "Dark ocean with bright ribbon-like currents. Because the image is mostly dark, "
            "most of the scan is quiet; the fast currents are the loud, high passages you "
            "hear cutting through."
        ),
        element="ocean",
    ),
    Dataset(
        id="co2",
        title="DYAMOND Global Carbon Dioxide",
        short="Global CO₂",
        svs_id="5196",
        svs_url="https://svs.gsfc.nasa.gov/5196/",
        year_range="Animation",
        source_frame="DYAMOND GEOS CO₂ concentration, global view",
        credit="NASA SVS / NASA GMAO GEOS, DYAMOND project",
        dataset_name="DYAMOND GEOS CO₂",
        sensor="Model · GEOS (DYAMOND)",
        description=(
            "Global column carbon dioxide. Yellow and orange mark high concentration, "
            "blue-green marks low."
        ),
        accessibility=(
            "A brown-yellow world map of carbon dioxide. Because concentration is smooth, the "
            "pitches glide rather than jump — you hear a slow swell rather than a tune."
        ),
        element="wind",
    ),
    Dataset(
        id="hurricane-maria",
        title="Hurricane Maria — Atlantic landfall",
        short="Hurricane Maria",
        svs_id="",
        svs_url="https://earthobservatory.nasa.gov/images/event/90948/hurricane-maria",
        year_range="2017",
        source_frame="Hurricane Maria over the Caribbean, 20 Sep 2017",
        credit="NASA/NOAA — MODIS and GOES satellite imagery (NASA Earth Observatory)",
        dataset_name="Hurricane Maria imagery",
        sensor="Terra/Aqua MODIS · GOES",
        description=(
            "A category-5 hurricane. The eye is almost black; the eyewall and spiral bands are "
            "near-white cloud, so the storm's structure is written directly in brightness."
        ),
        accessibility=(
            "A white spiral storm on dark ocean. Because the scan reads brightness, the eye is a "
            "sudden drop to near-silence in the middle of the loudest passage — you can literally "
            "hear the eye pass."
        ),
        element="storms",
    ),
    Dataset(
        id="lightning",
        title="ISS Lightning Imaging Sensor — 12-hour flash count",
        short="Thunderstorms",
        svs_id="5011",
        svs_url="https://svs.gsfc.nasa.gov/5011/",
        year_range="2023-10-05",
        source_frame="Last-12-hour browse image, 2023-10-05 00:02 → 13:34 UTC (13,137 flashes)",
        credit="NASA ISS-LIS · NASA MSFC / Earthdata",
        dataset_name="ISS-LIS flash counts",
        sensor="ISS · LIS",
        description=(
            "Flash counts over twelve hours of ISS orbit. Empty ocean rows are silent; the "
            "storm clusters over the Americas are dense bright pixels."
        ),
        accessibility=(
            "A world map with coloured speckles concentrated over the Americas and a legend strip "
            "along the bottom. Sparse rows become isolated quiet tones, dense storm rows become "
            "loud gritty clusters, and the legend row itself is a steady low drone."
        ),
        element="storms",
    ),
    Dataset(
        id="wind",
        title="GEOS Surface Winds and Precipitation",
        short="Wind",
        svs_id="5148",
        svs_url="https://svs.gsfc.nasa.gov/5148/",
        year_range="2023-08-15",
        source_frame="GEOS-FP surface winds (green) with GEOS precipitation, 15 Aug 2023 09:00 EDT",
        credit="NASA SVS / NASA GMAO GEOS-FP",
        dataset_name="GEOS-FP winds",
        sensor="Model · GEOS-FP",
        description=(
            "Green wind filaments over a true-colour Earth with precipitation in blue-white. "
            "Bright filaments are strong wind; dark ocean is calm."
        ),
        accessibility=(
            "A blue-and-white Earth with green streaks of wind. The bright storm bands are high "
            "and loud, the calmer ocean rows low and quiet, and the green filaments add texture "
            "noise wherever the wind is strong."
        ),
        element="wind",
    ),
    Dataset(
        id="wildfire-smoke",
        title="Wildfire Smoke over the Pacific Northwest",
        short="Wildfire Smoke",
        svs_id="",
        svs_url="https://earthobservatory.nasa.gov/images/151718/smoke-in-the-pacific-northwest",
        year_range="2023-02-28",
        source_frame="MODIS true-colour, smoke plumes over British Columbia and Washington",
        credit="NASA Earth Observatory — MODIS (Joshua Stevens)",
        dataset_name="MODIS true colour",
        sensor="Aqua/Terra MODIS",
        description=(
            "True-colour satellite view of dense smoke plumes. Grey-white smoke over dark forest "
            "and ocean: brightness is smoke density."
        ),
        accessibility=(
            "A satellite photograph: dark green forest, brown grassland, white smoke streaming in "
            "long plumes. Thick smoke rows are bright and noisy; the dark forest rows are low and "
            "quiet, so the sound follows each plume as the scan moves down the image."
        ),
        element="fire",
    ),
    Dataset(
        id="atmospheric-river",
        title="A 3D View of an Atmospheric River from an Earth System Model",
        short="Atmospheric River",
        svs_id="4960",
        svs_url="https://svs.gsfc.nasa.gov/4960/",
        year_range="3D model",
        source_frame="Atmospheric river moisture field over the eastern Pacific",
        credit="NASA SVS / NASA GEOS Earth system model",
        dataset_name="GEOS atmospheric river",
        sensor="Model · GEOS",
        description=(
            "A 3D-model atmospheric river: a bright ribbon of moisture crossing the Pacific "
            "toward the US west coast."
        ),
        accessibility=(
            "A dark globe with a bright blue-white ribbon of moisture. The ribbon's rows are "
            "the loud bright part; the empty sky around it is quiet, so the sound traces the "
            "river's shape as the scan moves down the frame."
        ),
        element="wind",
    ),
    Dataset(
        id="forest-height",
        title="GEDI Forest Height",
        short="GEDI Forest Height",
        svs_id="4950",
        svs_url="https://svs.gsfc.nasa.gov/4950/",
        year_range="Global map",
        source_frame="Global forest canopy height, GEDI + Landsat fusion",
        credit="NASA Earth Observatory / GEDI science team (UMD GLAD), Joshua Stevens",
        dataset_name="GEDI canopy height",
        sensor="ISS · GEDI",
        description=(
            "Global canopy height on a pale background. Dense tropical forest is bright "
            "green, desert and ice are near-white, so canopy height also reads as brightness."
        ),
        accessibility=(
            "A pale world map with green forests. Tall canopy rows are bright and sound high; "
            "bare land and ice sound low and faint. The Amazon, Congo and Indonesia are the "
            "strongest passages."
        ),
        element="land",
    ),
    Dataset(
        id="caldwell-73",
        title="Data Sonification: Caldwell 73 (NGC 1851)",
        short="Caldwell 73",
        svs_id="13786",
        svs_url="https://svs.gsfc.nasa.gov/13786/",
        year_range="Reference",
        source_frame="NGC 1851 globular cluster, Hubble/ground-based composite",
        credit="NASA/ESA Hubble; image credit for SVS sonification reference",
        dataset_name="Caldwell 73 imagery",
        sensor="Hubble Space Telescope",
        description=(
            "A dense globular cluster. Following NASA's own sonification method, the vertical "
            "position of stars is mapped across the frame and brightness sets pitch — this "
            "track uses exactly that rule."
        ),
        accessibility=(
            "A star cluster on black. Bright stars at the top of the image sound high, stars at "
            "the bottom sound low, and the gaps between stars are silence — the same "
            "left-to-right, top-to-bottom scan NASA uses for its own sonifications."
        ),
        element="space",
    ),
]

DATASETS_BY_ID = {d.id: d for d in DATASETS}
