import { belongsTo, column, scope } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { PlaceCategory } from '@aporta/shared'

import { PlaceSchema } from '#database/schema'
import Neighborhood from '#models/neighborhood'

/** A place of the city guide: where to eat, where to drink, what is happening, the services. */
export default class Place extends PlaceSchema {
  /** Only what has not been archived: see `Neighborhood.notDeleted`. */
  static notDeleted = scope((query) => {
    query.whereNull('deletedAt')
  })

  @column()
  declare category: PlaceCategory

  @belongsTo(() => Neighborhood)
  declare neighborhood: BelongsTo<typeof Neighborhood>
}
