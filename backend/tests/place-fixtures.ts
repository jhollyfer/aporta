import { randomUUID } from 'node:crypto'

import { PLACE_CATEGORY } from '@aporta/shared'

import Place, { type PlaceCreateInput } from '#domain/place/place.entity'
import { recorded } from '#tests/repository-fixtures'

/**
 * Guide places without a database, for the entity spec, the repository contract test and the
 * use-case unit tests. The neighborhood is only an id here: each spec says which one it is.
 */

/** The neighborhood the draft places sit in, in specs that have no neighborhoods table. */
export const PLACE_NEIGHBORHOOD_ID = '00000000-0000-4000-8000-0000000000b1'

/** A restaurant, unless the spec asks for another category (an event needs a `date`). */
export function placeDraft(input: Partial<PlaceCreateInput> = {}): Place {
  return recorded(
    Place.create({
      id: randomUUID(),
      category: PLACE_CATEGORY.EAT,
      name: 'Peixaria do Porto',
      description: 'Tambaqui e pirarucu na brasa.',
      neighborhoodId: PLACE_NEIGHBORHOOD_ID,
      address: 'Rua do Porto',
      hours: 'Seg a sáb, 11h às 15h',
      whatsapp: null,
      date: null,
      ...input,
    }),
  )
}
