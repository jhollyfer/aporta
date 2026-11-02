import type {
  ListingChanges,
  ListingProps,
} from '#domain/listing/listing.entity'
import type Neighborhood from '#domain/neighborhood/neighborhood.entity'
import type { OwnerListingUpdatePayload } from '#validators/owner/listings.validator'

/**
 * What the owner's form says, turned into what the entity takes (`_standards/backend.md` §4.9: pure
 * logic that two actions need lives in `_shared.<theme>`). The form speaks in fields (`monthly`,
 * `water`, one `rules` text) and the entity in structure (`priceMonthly`, `costs`, a list of
 * rules), so both `create` and `update` go through here and cannot read the same field two ways.
 *
 * A class with only `static`, like `WireDate`: it keeps no state and talks to nothing outside.
 */
export default class ListingInput {
  /**
   * The rules text as a list: one rule per line, blank lines dropped. The form has a single
   * textarea, and "one per line" is how the owner is asked to write them.
   */
  static rules(text: string): string[] {
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
  }

  /**
   * The edit as the entity takes it: only the fields the payload carried, so an absent field
   * stays as it is. `costs` and `owner` are whole objects in the entity, and the payload names them
   * one flag at a time, so the current values fill what was not sent. A new neighborhood brings its
   * center along: the pin follows the neighborhood.
   */
  static changes(
    payload: OwnerListingUpdatePayload,
    current: Readonly<ListingProps>,
    neighborhood: Neighborhood | null,
  ): ListingChanges {
    const center = neighborhood?.snapshot()
    const costsSent =
      payload.water !== undefined ||
      payload.electricity !== undefined ||
      payload.internet !== undefined
    const ownerSent =
      payload.ownerName !== undefined || payload.whatsapp !== undefined

    return {
      ...(payload.type !== undefined && { type: payload.type }),
      ...(payload.title !== undefined && { title: payload.title }),
      ...(payload.description !== undefined && {
        description: payload.description,
      }),
      ...(payload.address !== undefined && { address: payload.address }),
      ...(payload.monthly !== undefined && { priceMonthly: payload.monthly }),
      ...(payload.daily !== undefined && { priceDaily: payload.daily }),
      ...(payload.periods !== undefined && { periods: payload.periods }),
      ...(payload.minimumStayMonths !== undefined && {
        minimumStayMonths: payload.minimumStayMonths,
      }),
      ...(payload.bedrooms !== undefined && { bedrooms: payload.bedrooms }),
      ...(payload.bathrooms !== undefined && { bathrooms: payload.bathrooms }),
      ...(payload.furnished !== undefined && { furnished: payload.furnished }),
      ...(payload.rules !== undefined && {
        rules: ListingInput.rules(payload.rules),
      }),
      ...(costsSent && {
        costs: {
          water: payload.water ?? current.costs.water,
          electricity: payload.electricity ?? current.costs.electricity,
          internet: payload.internet ?? current.costs.internet,
        },
      }),
      ...(ownerSent && {
        owner: {
          name: payload.ownerName ?? current.owner.name,
          whatsapp: payload.whatsapp ?? current.owner.whatsapp,
        },
      }),
      ...(center && {
        neighborhoodId: center.id,
        lat: center.lat,
        lng: center.lng,
      }),
    }
  }
}
