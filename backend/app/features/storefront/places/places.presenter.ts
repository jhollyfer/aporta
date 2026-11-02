import type { StorefrontPlaceShowResponse } from '@aporta/shared'

import type { PlaceRecord } from '#repositories/place/place.repository'

/**
 * The guide place as the visitor reads it (`_standards/architecture.md` §10), by allowlist.
 * Left out are `deletedAt`, `neighborhoodId` and the stamps.
 */
export default class PlacePresenter {
  static show(record: PlaceRecord): StorefrontPlaceShowResponse {
    const place = record.place.snapshot()

    return {
      id: place.id,
      category: place.category,
      name: place.name,
      description: place.description,
      neighborhood: {
        slug: record.neighborhood.slug,
        name: record.neighborhood.name,
      },
      address: place.address,
      hours: place.hours,
      whatsapp: place.whatsapp,
      date: place.date,
    }
  }
}
