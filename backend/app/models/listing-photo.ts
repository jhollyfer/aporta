import { column } from '@adonisjs/lucid/orm'
import type { PhotoEnvironment } from '@aporta/shared'

import { ListingPhotoSchema } from '#database/schema'

/**
 * One picture slot of a listing, in the owner's order (`position`). It has no file yet: until the
 * upload exists (`docs/TASKS.md`, phase 4) it only says which environment the ad shows.
 *
 * It declares no `belongsTo(Listing)`: the relation is read from the listing (`hasMany`), and the
 * reverse one would close an import cycle between the two models that nothing needs.
 */
export default class ListingPhoto extends ListingPhotoSchema {
  @column()
  declare environment: PhotoEnvironment
}
