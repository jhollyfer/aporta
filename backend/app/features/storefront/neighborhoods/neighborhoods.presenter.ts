import type { StorefrontNeighborhoodShowResponse } from '@aporta/shared'

import type Neighborhood from '#domain/neighborhood/neighborhood.entity'

/**
 * The neighborhood as the visitor reads it (`_standards/architecture.md` §10), by allowlist.
 * Left out are `id`, `deletedAt` and the stamps: the visitor addresses a neighborhood by `slug`.
 */
export default class NeighborhoodPresenter {
  static show(neighborhood: Neighborhood): StorefrontNeighborhoodShowResponse {
    const snapshot = neighborhood.snapshot()

    return {
      slug: snapshot.slug,
      name: snapshot.name,
      lat: snapshot.lat,
      lng: snapshot.lng,
    }
  }
}
