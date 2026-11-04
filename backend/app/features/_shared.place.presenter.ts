import type { StorefrontPlaceShowResponse } from '@aporta/shared'

import type { PlaceRecord } from '#repositories/place/place.repository'

/**
 * The fields of a guide place that every reader sees, by allowlist (`_standards/architecture.md`
 * §10): the visitor's presenter returns them as they are and the staff's adds when it left the
 * guide. Left out are `deletedAt`, `neighborhoodId` and the stamps.
 */
export default class PlaceSharedPresenter {
  static fields(record: PlaceRecord): StorefrontPlaceShowResponse {
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
