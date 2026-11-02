import type { Neighborhood } from '@aporta/shared'

/**
 * The neighborhoods of Benjamin Constant the filter offers, copied from
 * `frontend/src/lib/data/neighborhoods.ts` (the backend never imports from the frontend: the two
 * copies are kept equal by hand, with the same slugs, until the frontend reads the API).
 *
 * The coordinates are APPROXIMATE (the center of each neighborhood, to be checked with the board
 * before the platform opens to the public): they place the map pin, nothing more.
 */
export const NEIGHBORHOODS: ReadonlyArray<Neighborhood> = [
  { slug: 'centro', name: 'Centro', lat: -4.3775, lng: -70.0312 },
  { slug: 'coaban', name: 'Coaban', lat: -4.3712, lng: -70.0265 },
  { slug: 'colonia', name: 'Colônia', lat: -4.3828, lng: -70.0368 },
  { slug: 'cidade-nova', name: 'Cidade Nova', lat: -4.3689, lng: -70.0341 },
  { slug: 'umariacu-1', name: 'Umariaçu I', lat: -4.3921, lng: -70.0214 },
  { slug: 'umariacu-2', name: 'Umariaçu II', lat: -4.3958, lng: -70.0182 },
]
