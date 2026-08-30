import type { OrbitConfig } from '../types/celestial';

export const BODY_IDS = [
  'sun',
  'hourglass-twins',
  'timber-hearth',
  'attlerock',
  'brittle-hollow',
  'hollows-lantern',
  'giants-deep',
  'ash-twin',
  'ember-twin',
  'dark-bramble',
  'interloper',
  'quantum-moon',
] as const;

export type BodyId = (typeof BODY_IDS)[number];

export const NAVIGATION_BODY_IDS = [
  'sun',
  'hourglass-twins',
  'ash-twin',
  'ember-twin',
  'timber-hearth',
  'attlerock',
  'brittle-hollow',
  'hollows-lantern',
  'giants-deep',
  'dark-bramble',
  'interloper',
  'quantum-moon',
] as const satisfies readonly BodyId[];

export type CelestialBody = Readonly<{
  id: BodyId;
  name: string;
  classification: string;
  type: string;
  tagline: string;
  pitch: string;
  attractions: readonly string[];
  travelTips: readonly string[];
  satelliteIds: readonly BodyId[];
  orbit?: OrbitConfig;
}>;

const orbit = (
  radius: number,
  period: number,
  phase: number,
  options: Readonly<Pick<OrbitConfig, 'direction' | 'eccentricity'>> = {},
): OrbitConfig => ({ radius, period, phase, ...options });

export const celestialBodies: readonly CelestialBody[] = [
  {
    id: 'sun', name: 'Sun', classification: 'Star', type: 'Solar primary',
    tagline: 'Go for the golden-hour glow, stay for the system-wide views.',
    pitch: 'The brightest stop on the itinerary offers unbeatable ambience, effortless navigation, and absolutely no chance of needing a flashlight.',
    attractions: ['Front-row corona watching', 'A nonstop parade of orbiting worlds'],
    travelTips: ['Pack industrial-strength sunscreen.', 'Admire from a very, very respectful distance.'], satelliteIds: [],
  },
  {
    id: 'timber-hearth', name: 'Timber Hearth', classification: 'Planet', type: 'Temperate terrestrial world',
    tagline: 'Go for the pine-scented launchpad, stay for the campfire stories.',
    pitch: 'This friendly little homeworld bundles forests, rivers, village charm, and big-sky optimism into one extremely cozy getaway.',
    attractions: ['Crater hiking with panoramic village views', 'Lazy river loops beneath towering pines'],
    travelTips: ['Save room for marshmallows.', 'Wave to the locals; half of them probably helped build your ship.'],
    satelliteIds: ['attlerock'], orbit: orbit(260, 42, 0.35, { direction: -1 }),
  },
  {
    id: 'attlerock', name: 'Attlerock', classification: 'Moon', type: 'Rocky satellite',
    tagline: 'Go for the low-gravity stroll, stay for the hometown skyline.',
    pitch: 'A quiet moon with first-trip energy, generous horizons, and the finest unobstructed view of Timber Hearth in the system.',
    attractions: ['Crater-to-crater moonwalking', 'Ridiculously clear stargazing'],
    travelTips: ['Perfect for a first solo outing.', 'Bring a flag, a harmonica, or both.'],
    satelliteIds: [], orbit: orbit(28, 10, 1.2, { direction: -1 }),
  },
  {
    id: 'brittle-hollow', name: 'Brittle Hollow', classification: 'Planet', type: 'Hollow volcanic world',
    tagline: 'Go for the cliffside drama, stay for the impossible architecture.',
    pitch: 'For travelers who think ordinary geology lacks suspense, this fractured world delivers hanging landscapes and vertigo in equal measure.',
    attractions: ['Hanging-city sightseeing', 'Front-row views of a beautifully unstable crust'],
    travelTips: ['Watch your step—and the step after that.', 'A jetpack is less an accessory and more a lifestyle choice.'],
    satelliteIds: ['hollows-lantern'], orbit: orbit(370, 58, 2.3, { direction: -1 }),
  },
  {
    id: 'hollows-lantern', name: "Hollow's Lantern", classification: 'Moon', type: 'Volcanic satellite',
    tagline: 'Go for the lava show, stay for the launch-window excitement.',
    pitch: 'The system’s hottest moon offers glowing rivers, explosive vistas, and a firm reminder that “active destination” is not marketing fluff.',
    attractions: ['Lava-channel overlooks', 'Eruptions visible from orbit'],
    travelTips: ['Heat shielding is mandatory.', 'Picnic blankets are strongly discouraged.'],
    satelliteIds: [], orbit: orbit(35, 13, 0.5, { direction: -1 }),
  },
  {
    id: 'giants-deep', name: "Giant's Deep", classification: 'Planet', type: 'Ocean giant',
    tagline: 'Go for the island hopping, stay for the surprise skydiving.',
    pitch: 'A storm-chaser’s paradise where every island comes with ocean views, dramatic weather, and a flexible definition of “ground level.”',
    attractions: ['Cyclone spotting from a safe-ish distance', 'The system’s most committed ocean panorama'],
    travelTips: ['Waterproof everything.', 'If the horizon starts rotating, hold on and enjoy the ride.'],
    satelliteIds: [], orbit: orbit(470, 74, 4.7, { direction: -1 }),
  },
  {
    id: 'hourglass-twins', name: 'Hourglass Twins', classification: 'Binary system', type: 'Paired desert worlds',
    tagline: 'Go for the twin-world spectacle, stay for the moving sand bridge.',
    pitch: 'Two contrasting desert destinations share one orbit and one unforgettable centerpiece: a living hourglass performance between them.',
    attractions: ['A perfect twin-world photo opportunity', 'A sweeping sand beam that links the pair'],
    travelTips: ['Watch both horizons at once.', 'The best views are somewhere between the two worlds.'],
    satelliteIds: ['ash-twin', 'ember-twin'], orbit: orbit(170, 30, 3.8, { direction: -1 }),
  },
  {
    id: 'ash-twin', name: 'Ash Twin', classification: 'Planet', type: 'Hourglass twin',
    tagline: 'Go for the sweeping dunes, stay for the celestial hourglass.',
    pitch: 'Minimalist desert scenery meets a spectacular twin-world performance as sand streams overhead with clockwork theatricality.',
    attractions: ['Freshly revealed desert vistas', 'The best view of the interplanetary sand column'],
    travelTips: ['Timing matters more than footwear.', 'Keep one eye on the sand and one on your parking spot.'],
    satelliteIds: [], orbit: orbit(170, 30, 3.8, { direction: -1 }),
  },
  {
    id: 'ember-twin', name: 'Ember Twin', classification: 'Planet', type: 'Hourglass twin',
    tagline: 'Go for the red-rock canyons, stay for the caves—briefly.',
    pitch: 'A compact desert escape packed with winding passages, glowing stone, and just enough incoming sand to keep the itinerary brisk.',
    attractions: ['Sunset canyon walks', 'Cave routes for confident navigators'],
    travelTips: ['Travel light and check the time.', 'Claustrophobic visitors may prefer the scenic overlook.'],
    satelliteIds: [], orbit: orbit(170, 30, 3.8, { direction: -1 }),
  },
  {
    id: 'dark-bramble', name: 'Dark Bramble', classification: 'Planet', type: 'Bramble world',
    tagline: 'Go for the eerie fog, stay for the suspiciously familiar exits.',
    pitch: 'Part thorn garden, part cosmic maze, this moody destination is ideal for travelers who find straightforward directions deeply overrated.',
    attractions: ['Cathedral-sized bramble tunnels', 'Atmospheric fog in every direction'],
    travelTips: ['Quiet engines make good neighbors.', 'Leave a breadcrumb trail; actual breadcrumbs are optional.'],
    satelliteIds: [], orbit: orbit(570, 118, 5.45, { direction: -1 }),
  },
  {
    id: 'interloper', name: 'Interloper', classification: 'Comet', type: 'Eccentric icy comet',
    tagline: 'Go for the sparkling ice, stay for the fastest tour in town.',
    pitch: 'Catch this brilliant wanderer for a limited-time cruise through the system, complete with pristine ice and a tail made for postcards.',
    attractions: ['Glittering surface ridges', 'A sweeping comet-tail photo opportunity'],
    travelTips: ['Book early; it does not wait.', 'Secure your ship before admiring the scenery.'],
    satelliteIds: [], orbit: orbit(690, 160, 0.25, { eccentricity: 0.82 }),
  },
  {
    id: 'quantum-moon', name: 'Quantum Moon', classification: 'Moon', type: 'Uncertain satellite',
    tagline: 'Go for the mystery, stay for the vanishing act.',
    pitch: 'The system’s most exclusive pop-up destination changes its address without notice and rewards patient travelers with unmatched bragging rights.',
    attractions: ['A different planetary backdrop on repeat visits', 'Delightfully unreliable photo opportunities'],
    travelTips: ['Keep looking; observation is half the itinerary.', 'Flexible bookings are essential.'],
    satelliteIds: [],
  },
];

export function getBody(id: BodyId): CelestialBody | undefined {
  return celestialBodies.find((body) => body.id === id);
}
