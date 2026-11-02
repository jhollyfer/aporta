import { randomUUID } from 'node:crypto'

import {
  LISTING_PERIOD,
  LISTING_STATUS,
  LISTING_TYPE,
  type ListingStatus,
  type OwnerListingCreate,
} from '@aporta/shared'

import Listing, {
  type ListingCreateInput,
} from '#domain/listing/listing.entity'
import type Neighborhood from '#domain/neighborhood/neighborhood.entity'
import type ListingMemoryRepository from '#repositories/listing/listing.memory.repository'
import ListingRepository from '#repositories/listing/listing.repository'
import type NeighborhoodMemoryRepository from '#repositories/neighborhood/neighborhood.memory.repository'
import { neighborhoodDraft } from '#tests/neighborhood-fixtures'
import { recorded } from '#tests/repository-fixtures'

/**
 * Listings without a database, for the entity spec, the repository contract test and the
 * use-case unit tests. The neighborhood is only an id here: each spec says which one it is.
 */

/** The neighborhood the draft listings sit in, in specs that have no neighborhoods table. */
export const LISTING_NEIGHBORHOOD_ID = '00000000-0000-4000-8000-0000000000c1'

/** A furnished kitnet at nine hundred a month, without id or slug: each spec chooses its own. */
export const LISTING_INPUT = {
  ownerId: null,
  type: LISTING_TYPE.KITNET,
  title: 'Kitnet mobiliada perto do porto',
  description: 'Kitnet com cama, geladeira e fogão.',
  neighborhoodId: LISTING_NEIGHBORHOOD_ID,
  address: 'Travessa a duas quadras do porto',
  priceMonthly: 900,
  priceDaily: null,
  costs: { water: true, electricity: true, internet: true },
  periods: [LISTING_PERIOD.SEMESTER, LISTING_PERIOD.MONTHLY],
  minimumStayMonths: 4,
  availableFrom: '2027-01-15',
  bedrooms: 1,
  bathrooms: 1,
  furnished: true,
  rules: ['Uma pessoa ou casal'],
  owner: { name: 'Seu Raimundo', whatsapp: '5597999990002', verifiedAt: null },
  lat: -4.3779,
  lng: -70.0309,
} as const

/** A `DRAFT` listing, as the entity creates it, with a unique `slug` per call. */
export function listingDraft(input: Partial<ListingCreateInput> = {}): Listing {
  const id = randomUUID()

  return recorded(
    Listing.create({ id, slug: `anuncio-${id}`, ...LISTING_INPUT, ...input }),
  )
}

/**
 * A listing in the given state (`PUBLISHED` by default). Born `DRAFT` and rehydrated with the
 * state: there is no verb for it yet (the review that publishes is later work), and `restore` is
 * how the repository brings a stored ad back.
 */
export function listingIn(
  status: ListingStatus = LISTING_STATUS.PUBLISHED,
  input: Partial<ListingCreateInput> = {},
  deletedAt: Date | null = null,
): Listing {
  return Listing.restore({
    ...listingDraft(input).snapshot(),
    status,
    deletedAt,
  })
}

/**
 * A listing repository whose every call fails like a dropped connection: the use-case unit specs
 * use it to prove the `catch` answers the module's 500 code instead of letting the error out.
 */
export class FailingListingRepository extends ListingRepository {
  findById(): never {
    throw new Error('database down')
  }

  findRecordById(): never {
    throw new Error('database down')
  }

  findAnyById(): never {
    throw new Error('database down')
  }

  findAnyRecordById(): never {
    throw new Error('database down')
  }

  paginateForReview(): never {
    throw new Error('database down')
  }

  paginateOwned(): never {
    throw new Error('database down')
  }

  save(): never {
    throw new Error('database down')
  }

  findPublishedRecordBySlug(): never {
    throw new Error('database down')
  }

  paginatePublished(): never {
    throw new Error('database down')
  }

  findPublishedPins(): never {
    throw new Error('database down')
  }
}

/**
 * What the owner's form sends to create an ad, already through the validator: the payload the
 * create use-case receives. Two lines of rules, to prove the text becomes a list.
 */
export const OWNER_LISTING_PAYLOAD = {
  type: LISTING_TYPE.KITNET,
  furnished: true,
  neighborhood: 'centro',
  address: 'Rua do Porto, 120',
  monthly: 900,
  water: true,
  electricity: true,
  internet: false,
  periods: [LISTING_PERIOD.SEMESTER],
  minimumStayMonths: 4,
  title: 'Kitnet perto do porto',
  description: 'Kitnet mobiliada, com cama, geladeira e fogão.',
  rules: 'Sem festa\n  Uma pessoa ou casal  \n\n',
  ownerName: 'Seu Raimundo',
  whatsapp: '5597999990001',
} as const satisfies OwnerListingCreate

/**
 * Puts one neighborhood (`centro`) in the two memory repositories the owner's use-cases need: the
 * neighborhood repository answers the `slug` lookup and the listing repository answers the join
 * the record carries. The specs build the repositories themselves (a collaborator never comes
 * from `new` outside a spec) and hand them here.
 */
export function centroIn(
  listings: ListingMemoryRepository,
  neighborhoods: NeighborhoodMemoryRepository,
): Neighborhood {
  const centro = neighborhoodDraft({
    slug: 'centro',
    name: 'Centro',
    lat: -4.37,
    lng: -70.03,
  })
  neighborhoods.put(centro)
  listings.putNeighborhood(centro.id, { slug: 'centro', name: 'Centro' })

  return centro
}
