import factory from '@adonisjs/lucid/factories'
import { PHOTO_ENVIRONMENT } from '@aporta/shared'

import ListingPhoto from '#models/listing-photo'

/** One picture slot. `listingId` and `position` come from the spec: they are what the row means. */
export const ListingPhotoFactory = factory
  .define(ListingPhoto, () => ({
    environment: PHOTO_ENVIRONMENT.FACADE,
  }))
  .build()
