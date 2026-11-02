import {
  LISTING_STATUS,
  type ListingStatus,
  type PlaceCategory,
} from '@aporta/shared'
import { DateTime } from 'luxon'

import { ListingPhotoFactory } from '#database/factories/listing-photo.factory'
import { ListingFactory } from '#database/factories/listing.factory'
import { NeighborhoodFactory } from '#database/factories/neighborhood.factory'
import { PlaceFactory } from '#database/factories/place.factory'
import type Listing from '#domain/listing/listing.entity'
import type Neighborhood from '#domain/neighborhood/neighborhood.entity'
import type Place from '#domain/place/place.entity'
import ListingModel from '#models/listing'
import type NeighborhoodModel from '#models/neighborhood'
import type PlaceModel from '#models/place'
import LucidMapping from '#repositories/shared/lucid-mapping'

/**
 * The storefront rows for the specs that go through the database: the HTTP specs of the three
 * resources and the Lucid side of the repository contract tests. The values live in
 * `database/factories/`; what stays here is the short signature and the foreign key each spec
 * should not have to build by hand.
 */

/** A neighborhood row. */
export async function neighborhood(
  attributes: Partial<NeighborhoodModel> = {},
) {
  return NeighborhoodFactory.merge(attributes).create()
}

/**
 * A listing row, `PUBLISHED` unless the spec asks for another state. `neighborhoodId` is `NOT NULL`:
 * an ad without one gets a neighborhood of its own.
 */
export async function listing(attributes: Partial<ListingModel> = {}) {
  const neighborhoodId = attributes.neighborhoodId ?? (await neighborhood()).id

  return ListingFactory.merge({ ...attributes, neighborhoodId }).create()
}

/** A listing row in a given state: the ones the storefront must never show are built by this. */
export async function listingWithStatus(
  status: ListingStatus,
  attributes: Partial<ListingModel> = {},
) {
  return listing({ ...attributes, status })
}

/** A published listing row that has been archived (trash), which the storefront must not show. */
export async function archivedListing(attributes: Partial<ListingModel> = {}) {
  return listing({
    status: LISTING_STATUS.PUBLISHED,
    ...attributes,
    deletedAt: DateTime.now(),
  })
}

/** A guide place row. `neighborhoodId` is `NOT NULL`: a place without one gets a neighborhood. */
export async function place(attributes: Partial<PlaceModel> = {}) {
  const neighborhoodId = attributes.neighborhoodId ?? (await neighborhood()).id

  return PlaceFactory.merge({ ...attributes, neighborhoodId }).create()
}

/** A guide place row of a given tab. */
export async function placeOf(
  category: PlaceCategory,
  attributes: Partial<PlaceModel> = {},
) {
  return place({ ...attributes, category })
}

/**
 * Writes an entity built without a database as rows: the listing and its photos in order. The
 * neighborhood row has to exist already (`neighborhoodId` is a foreign key): the spec creates it
 * with `neighborhood()` and builds the entity with its id. It is how the Lucid side of the contract
 * test receives the same `Listing` the memory side is `put`.
 */
export async function seedListing(
  entity: Listing,
  stamps: { createdAt?: Date; updatedAt?: Date } = {},
) {
  const snapshot = entity.snapshot()
  const row = await ListingFactory.merge({
    id: snapshot.id,
    slug: snapshot.slug,
    status: snapshot.status,
    type: snapshot.type,
    title: snapshot.title,
    description: snapshot.description,
    neighborhoodId: snapshot.neighborhoodId,
    address: snapshot.address,
    priceMonthly: snapshot.priceMonthly,
    priceDaily: snapshot.priceDaily,
    costWater: snapshot.costs.water,
    costElectricity: snapshot.costs.electricity,
    costInternet: snapshot.costs.internet,
    periods: [...snapshot.periods],
    minimumStayMonths: snapshot.minimumStayMonths,
    availableFrom: DateTime.fromISO(snapshot.availableFrom),
    bedrooms: snapshot.bedrooms,
    bathrooms: snapshot.bathrooms,
    furnished: snapshot.furnished,
    rules: [...snapshot.rules],
    ownerName: snapshot.owner.name,
    ownerWhatsapp: snapshot.owner.whatsapp,
    ownerVerifiedAt: LucidMapping.dateTime(snapshot.owner.verifiedAt),
    lat: snapshot.lat,
    lng: snapshot.lng,
    deletedAt: LucidMapping.dateTime(snapshot.deletedAt),
  }).create()

  for (const [position, photo] of snapshot.photos.entries()) {
    await ListingPhotoFactory.merge({
      id: photo.id,
      listingId: row.id,
      environment: photo.environment,
      position,
    }).create()
  }

  // `createdAt`/`updatedAt` come from `autoCreate`/`autoUpdate`, so the instant a spec wants is
  // written after, with a query: a model `save()` would put `updatedAt` back to now.
  if (stamps.createdAt)
    await ListingModel.query()
      .where('id', row.id)
      .update({ createdAt: DateTime.fromJSDate(stamps.createdAt) })

  if (stamps.updatedAt)
    await ListingModel.query()
      .where('id', row.id)
      .update({ updatedAt: DateTime.fromJSDate(stamps.updatedAt) })

  return row
}

/** Writes a neighborhood entity built without a database as a row, with the key it already has. */
export async function seedNeighborhood(entity: Neighborhood) {
  const snapshot = entity.snapshot()

  return neighborhood({
    id: snapshot.id,
    slug: snapshot.slug,
    name: snapshot.name,
    lat: snapshot.lat,
    lng: snapshot.lng,
    deletedAt: LucidMapping.dateTime(snapshot.deletedAt),
  })
}

/**
 * Writes a place entity built without a database as a row. The neighborhood row has to exist
 * already (`neighborhoodId` is a foreign key), as with `seedListing`.
 */
export async function seedPlace(entity: Place) {
  const snapshot = entity.snapshot()
  let date: DateTime | null = null
  if (snapshot.date) date = DateTime.fromISO(snapshot.date)

  return place({
    id: snapshot.id,
    category: snapshot.category,
    name: snapshot.name,
    description: snapshot.description,
    neighborhoodId: snapshot.neighborhoodId,
    address: snapshot.address,
    hours: snapshot.hours,
    whatsapp: snapshot.whatsapp,
    date,
    deletedAt: LucidMapping.dateTime(snapshot.deletedAt),
  })
}
