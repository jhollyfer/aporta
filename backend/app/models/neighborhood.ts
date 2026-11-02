import { scope } from '@adonisjs/lucid/orm'

import { NeighborhoodSchema } from '#database/schema'

/**
 * A neighborhood of Benjamin Constant: the main filter of the listings and the pin of the map.
 */
export default class Neighborhood extends NeighborhoodSchema {
  /**
   * Only what has not been archived. The filter lives here, once, so a query that forgets it
   * cannot exist: the archived neighborhood would come back in the storefront without warning
   * (`_standards/backend.md` §4.8).
   */
  static notDeleted = scope((query) => {
    query.whereNull('deletedAt')
  })
}
