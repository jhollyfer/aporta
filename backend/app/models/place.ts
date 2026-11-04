import { belongsTo, column, scope } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import {
  TRASHED_MODE,
  type PlaceCategory,
  type TrashedMode,
} from '@aporta/shared'

import { PlaceSchema } from '#database/schema'
import Neighborhood from '#models/neighborhood'

/** A place of the city guide: where to eat, where to drink, what is happening, the services. */
export default class Place extends PlaceSchema {
  /** Only what has not been archived: see `Neighborhood.notDeleted`. */
  static notDeleted = scope((query) => {
    query.whereNull('deletedAt')
  })

  /**
   * The `?trashed` cut as a scope, for the repository to choose by the criterion's mode
   * (`_standards/backend.md` §4.8): absent means the live ones, `only` the trash and `with` both.
   * _doc-lib/lucid.md#model-query-scopes.
   */
  static trashed = scope((query, mode?: TrashedMode) => {
    if (mode === TRASHED_MODE.WITH) return

    if (mode === TRASHED_MODE.ONLY) {
      query.whereNotNull('deletedAt')
      return
    }

    query.whereNull('deletedAt')
  })

  @column()
  declare category: PlaceCategory

  @belongsTo(() => Neighborhood)
  declare neighborhood: BelongsTo<typeof Neighborhood>
}
