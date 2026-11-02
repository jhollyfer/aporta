import factory from '@adonisjs/lucid/factories'
import { PLACE_CATEGORY } from '@aporta/shared'

import Place from '#models/place'

/**
 * Guide place, a restaurant by default (no date: only an event has one). `neighborhoodId` comes
 * from the spec, for the same reason as `ListingFactory`.
 */
export const PlaceFactory = factory
  .define(Place, () => ({
    category: PLACE_CATEGORY.EAT,
    name: 'Lugar de teste',
    description: 'Lugar de teste do guia.',
    address: 'Rua de teste',
    hours: 'Todos os dias, 9h às 18h',
    whatsapp: null,
    date: null,
  }))
  .build()
