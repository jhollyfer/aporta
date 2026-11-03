import type { Neighborhood } from '@aporta/shared'

/**
 * The 14 official neighborhoods of Benjamin Constant, as the city lists them (the list the owner
 * supplied), in the same order. The backend never imports from the frontend: the filter reads
 * these from the API (`GET /storefront/neighborhoods`).
 *
 * The coordinates are APPROXIMATE and only place the map pin. Centro, Cidade Nova and Colônia I
 * carry the approximate center already used; every other neighborhood is PROVISIONAL at the
 * center of Centro (`PROVISIONAL`) until someone who knows the city supplies the real point
 * (`docs/TASKS.md` 7.10).
 */
const PROVISIONAL = { lat: -4.3775, lng: -70.0312 } as const

export const NEIGHBORHOODS: ReadonlyArray<Neighborhood> = [
  { slug: 'agropalmin', name: 'Agropalmin', ...PROVISIONAL },
  { slug: 'alzenir-magalhaes', name: 'Alzenir Magalhães', ...PROVISIONAL },
  { slug: 'bom-jardim', name: 'Bom Jardim', ...PROVISIONAL },
  { slug: 'castanhal', name: 'Castanhal', ...PROVISIONAL },
  { slug: 'centro', name: 'Centro', lat: -4.3775, lng: -70.0312 },
  { slug: 'cidade-nova', name: 'Cidade Nova', lat: -4.3689, lng: -70.0341 },
  { slug: 'cohabam', name: 'Cohabam', ...PROVISIONAL },
  { slug: 'coimbra', name: 'Coimbra', ...PROVISIONAL },
  { slug: 'colonia-1', name: 'Colônia I', lat: -4.3828, lng: -70.0368 },
  { slug: 'colonia-2', name: 'Colônia II', ...PROVISIONAL },
  { slug: 'eduardo-braga', name: 'Eduardo Braga', ...PROVISIONAL },
  { slug: 'javarizinho', name: 'Javarizinho', ...PROVISIONAL },
  { slug: 'monte-da-redencao', name: 'Monte da Redenção', ...PROVISIONAL },
  { slug: 'umarizal', name: 'Umarizal', ...PROVISIONAL },
]
