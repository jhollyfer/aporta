import type { ListingBounds } from '#repositories/listing/listing.repository'

/** The four optional corners as the validator hands them over. */
type MapWindowPayload = {
  readonly minLng?: number
  readonly minLat?: number
  readonly maxLng?: number
  readonly maxLat?: number
}

/**
 * The map window of a storefront read (`_standards/backend.md` §4.9: logic two modules need goes
 * up to `features/_shared.<theme>.ts`; here the catalog and the pins).
 *
 * The validator already guarantees all four corners or none (`requiredIfAnyExists`), so a partial
 * window is not a case to handle here: it simply cannot arrive, and `undefined` means "no window".
 * A class with only `static`, like `ListingPhotoUrls`: it keeps no state.
 */
export default class MapWindow {
  static of(payload: MapWindowPayload): ListingBounds | undefined {
    const { minLng, minLat, maxLng, maxLat } = payload

    if (
      minLng === undefined ||
      minLat === undefined ||
      maxLng === undefined ||
      maxLat === undefined
    )
      return undefined

    return { minLng, minLat, maxLng, maxLat }
  }
}
