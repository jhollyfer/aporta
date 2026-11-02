import factory from '@adonisjs/lucid/factories'
import { LISTING_PERIOD, LISTING_STATUS, LISTING_TYPE } from '@aporta/shared'
import { DateTime } from 'luxon'

import Listing from '#models/listing'

/**
 * Published listing, monthly price only.
 *
 * The texts are fixed on purpose, for the same reason as `NeighborhoodFactory`: the storefront
 * specs search by term and count results. Only the `slug` varies (unique index).
 *
 * `neighborhoodId` stays **out** of the definition: declaring the relation would make every ad be
 * born with a new neighborhood, and the specs that filter by neighborhood want to pass their own.
 * `storefront-fixtures.ts` creates one when the spec does not.
 */
export const ListingFactory = factory
  .define(Listing, ({ faker }) => ({
    slug: `anuncio-${faker.string.alphanumeric({ length: 8, casing: 'lower' })}`,
    status: LISTING_STATUS.PUBLISHED,
    type: LISTING_TYPE.KITNET,
    title: 'Kitnet de teste',
    description: 'Kitnet de teste com cama e ventilador.',
    address: 'Rua de teste',
    priceMonthly: 900,
    priceDaily: null,
    costWater: true,
    costElectricity: false,
    costInternet: false,
    periods: [LISTING_PERIOD.SEMESTER, LISTING_PERIOD.MONTHLY],
    minimumStayMonths: 4,
    availableFrom: DateTime.fromISO('2027-01-15'),
    bedrooms: 1,
    bathrooms: 1,
    furnished: true,
    rules: ['Sem festa'],
    ownerName: 'Dono de teste',
    ownerWhatsapp: '5597999990000',
    ownerVerifiedAt: null,
    lat: -4.3779,
    lng: -70.0309,
  }))
  .build()
