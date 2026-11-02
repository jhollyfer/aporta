import { randomUUID } from 'node:crypto'

import Neighborhood, {
  type NeighborhoodCreateInput,
} from '#domain/neighborhood/neighborhood.entity'
import { recorded } from '#tests/repository-fixtures'

/**
 * Neighborhoods without a database, for the entity spec, the repository contract test and the
 * use-case unit tests.
 */

/** A neighborhood with a unique `slug` per call, unless the spec asks for one. */
export function neighborhoodDraft(
  input: Partial<NeighborhoodCreateInput> = {},
): Neighborhood {
  const id = randomUUID()

  return recorded(
    Neighborhood.create({
      id,
      slug: `bairro-${id}`,
      name: 'Centro',
      lat: -4.3775,
      lng: -70.0312,
      ...input,
    }),
  )
}
