import { randomUUID } from 'node:crypto'

import { PLACE_CATEGORY } from '@aporta/shared'

import type Neighborhood from '#domain/neighborhood/neighborhood.entity'
import Place, { type PlaceCreateInput } from '#domain/place/place.entity'
import type NeighborhoodMemoryRepository from '#repositories/neighborhood/neighborhood.memory.repository'
import type PlaceMemoryRepository from '#repositories/place/place.memory.repository'
import PlaceRepository from '#repositories/place/place.repository'
import { neighborhoodDraft } from '#tests/neighborhood-fixtures'
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

/**
 * A place repository whose every call fails like a dropped connection: the use-case unit specs
 * use it to prove the `catch` answers the module's 500 code instead of letting the error out.
 */
export class FailingPlaceRepository extends PlaceRepository {
  paginate(): never {
    throw new Error('database down')
  }

  findAnyRecordById(): never {
    throw new Error('database down')
  }

  save(): never {
    throw new Error('database down')
  }

  delete(): never {
    throw new Error('database down')
  }
}

/**
 * A neighborhood both in-memory repositories know: the one the use-case finds by `slug` and the
 * one the place record carries. The specs build the repositories themselves (a collaborator never
 * comes from `new` outside a spec) and hand them here.
 */
export function centroForPlaces(
  places: PlaceMemoryRepository,
  neighborhoods: NeighborhoodMemoryRepository,
): Neighborhood {
  const centro = neighborhoodDraft({ slug: 'centro', name: 'Centro' })
  neighborhoods.put(centro)
  places.putNeighborhood(centro.id, { slug: 'centro', name: 'Centro' })

  return centro
}

/** What the staff's form sends, already through the validator: the payload create and update receive. */
export const PLACE_PAYLOAD = {
  category: PLACE_CATEGORY.EAT,
  name: 'Tacacá da Praça',
  description: 'Tacacá quentinho no fim da tarde.',
  neighborhood: 'centro',
  address: 'Praça da Matriz',
  hours: 'Todos os dias, 16h às 21h',
} as const
