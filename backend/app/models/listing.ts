import { belongsTo, column, hasMany, scope } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import {
  LISTING_STATUS,
  type ListingPeriod,
  type ListingStatus,
  type ListingType,
} from '@aporta/shared'

import { ListingSchema } from '#database/schema'
import ListingPhoto from '#models/listing-photo'
import Neighborhood from '#models/neighborhood'

/**
 * The property ad, with the owner denormalized in `owner_*` (`docs/DECISIONS.md`, decided with the
 * migration `create_listings`).
 */
export default class Listing extends ListingSchema {
  /** Only what has not been archived: see `Neighborhood.notDeleted`. */
  static notDeleted = scope((query) => {
    query.whereNull('deletedAt')
  })

  /**
   * What the public storefront may see: `PUBLISHED` **and** outside the trash.
   *
   * The two conditions are one scope on purpose. Written by hand in each public query, the
   * status or the trash cut is the line someone forgets, and a draft or an archived ad would reach
   * a visitor; a scope cannot be half applied.
   */
  static published = scope((query) => {
    query.where('status', LISTING_STATUS.PUBLISHED).whereNull('deletedAt')
  })

  @column()
  declare status: ListingStatus

  @column()
  declare type: ListingType

  /**
   * Redeclared because the generated class types a `text[]` column as `any`. Postgres hands the
   * driver a real array, and the entity checks it on the way in (`ListingLucidRepository`).
   */
  @column()
  declare periods: ListingPeriod[]

  @column()
  declare rules: string[]

  @belongsTo(() => Neighborhood)
  declare neighborhood: BelongsTo<typeof Neighborhood>

  @hasMany(() => ListingPhoto)
  declare photos: HasMany<typeof ListingPhoto>
}
