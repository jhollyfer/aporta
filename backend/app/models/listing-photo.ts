import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { PhotoEnvironment } from '@aporta/shared'

import { ListingPhotoSchema } from '#database/schema'
import Storage from '#models/storage'

/**
 * One picture slot of a listing, in the owner's order (`position`). `storageId` is the file it
 * shows; null is a slot with no picture yet, which the frontend draws as the environment.
 *
 * It declares no `belongsTo(Listing)`: the relation is read from the listing (`hasMany`), and the
 * reverse one would close an import cycle between the two models that nothing needs.
 */
export default class ListingPhoto extends ListingPhotoSchema {
  @column()
  declare environment: PhotoEnvironment

  @belongsTo(() => Storage)
  declare storage: BelongsTo<typeof Storage>
}
