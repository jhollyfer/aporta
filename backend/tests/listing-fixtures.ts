import { randomUUID } from 'node:crypto'

import {
  LISTING_PERIOD,
  LISTING_STATUS,
  LISTING_TYPE,
  type ListingStatus,
} from '@aporta/shared'

import Listing, {
  type ListingCreateInput,
} from '#domain/listing/listing.entity'
import { recorded } from '#tests/repository-fixtures'

/**
 * Listings without a database, for the entity spec, the repository contract test and the
 * use-case unit tests. The neighborhood is only an id here: each spec says which one it is.
 */

/** The neighborhood the draft listings sit in, in specs that have no neighborhoods table. */
export const LISTING_NEIGHBORHOOD_ID = '00000000-0000-4000-8000-0000000000c1'

/** A furnished kitnet at nine hundred a month, without id or slug: each spec chooses its own. */
export const LISTING_INPUT = {
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
