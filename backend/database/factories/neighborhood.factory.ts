import factory from '@adonisjs/lucid/factories'

import Neighborhood from '#models/neighborhood'

/**
 * Neighborhood. The name and the center are fixed on purpose: the storefront specs search by term
 * and compare coordinates, and random text would make the result depend on the generator's luck.
 * Only the `slug` varies, because it has a unique index.
 */
export const NeighborhoodFactory = factory
  .define(Neighborhood, ({ faker }) => ({
    slug: `bairro-${faker.string.alphanumeric({ length: 8, casing: 'lower' })}`,
    name: 'Bairro de teste',
    lat: -4.3775,
    lng: -70.0312,
  }))
  .build()
