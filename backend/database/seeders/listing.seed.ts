import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import {
  LISTING_STATUS,
  PHOTO_ENVIRONMENT,
  STORAGE_MIMETYPE,
  UPLOAD_STATUS,
  type Listing,
} from '@aporta/shared'
import { DateTime } from 'luxon'

import {
  DEMO_PHOTO_POOL_BY_TYPE,
  DEMO_PHOTOS,
  type DemoPhoto,
} from '#database/data/demo-photos'
import { LISTINGS } from '#database/data/listings'
import NeighborhoodSeeder from '#database/seeders/neighborhood.seed'
import SampleOwnerSeeder from '#database/seeders/sample-owner.seed'
import FileSignature from '#domain/shared/file-signature.value-object'
import ListingModel from '#models/listing'
import ListingPhotoModel from '#models/listing-photo'
import Neighborhood from '#models/neighborhood'
import StorageModel from '#models/storage'
import StorageContract from '#services/storage/storage.contract'

/**
 * The twelve sample listings, all `PUBLISHED`. Part of the demo, switched on by
 * `SEED_DEMO_PASSWORD` having a value (`_standards/backend.md` §6.2, "Seed ligado pela chave"):
 * the phones are fictional and the owners are generic names, and a database must never be born
 * with ads that send a visitor to a number that is not real unless its operator asked for the
 * demo (`docs/TASKS.md` 7.10). With the key empty the seeder logs one line and skips.
 *
 * Idempotent by `slug` (`updateOrCreate`, _doc-lib/lucid.md#seeders), and the photos by
 * `(listing, position)`, so the second run changes nothing and adds nothing. It runs the
 * neighborhood seeder first for the same reason that one explains.
 *
 * Every sample ad is linked to the sample owner's account (`SampleOwnerSeeder`), so the owner's
 * routes have ads to list and edit. The denormalized `owner_name`, `owner_whatsapp` and
 * `owner_verified_at` stay as they were: the storefront still reads the contact from them, and
 * dropping them is a later contract step. The link is rewritten on every run, so an ad someone
 * pointed elsewhere by hand comes back.
 *
 * `owner.updatedAt` of the sample becomes the listing's `updated_at` (and `created_at`), written
 * with a query after the save: `updated_at` is `autoUpdate`, and a model `save()` would put it
 * back to now, which would make every seeded ad look updated today and defeat the badge that
 * says how stale an ad is. `owner.verified` becomes a verification instant, that same day.
 *
 * Each photo slot gets a picture from `DEMO_PHOTOS`, by the ad's type and the slot's environment,
 * rotating through the pool so that two houses do not share a facade. The file is fetched once,
 * written to the bucket under `demo/listings/<id>.jpg` and recorded as an `UPLOADED` storage of
 * the sample owner; the ads that pick the same picture share that one file. A second run finds
 * the row and the object and fetches nothing. When no source answers, or the bucket refuses, the
 * slot keeps no picture (the storefront shows the neutral frame) and the seed goes on: the demo
 * must still come up on a machine without network.
 */
export default class ListingSeeder extends BaseSeeder {
  /** How long one source may take to deliver a picture, in milliseconds. */
  private static readonly FETCH_TIMEOUT = 20_000

  /** The largest picture accepted from a source: the originals are about 1024 px wide. */
  private static readonly MAX_BYTES = 5 * 1024 * 1024

  /** The storage id of each picture already settled in this run, `null` when it failed. */
  readonly #pictures = new Map<string, string | null>()

  override async run() {
    const ownerId = await SampleOwnerSeeder.ensure()

    // The owner seeder already said why: the demo is off.
    if (!ownerId) return

    await NeighborhoodSeeder.ensure()

    const neighborhoods = await Neighborhood.query().whereIn(
      'slug',
      LISTINGS.map((listing) => listing.neighborhood),
    )

    const storage = await app.container.make(StorageContract)

    for (const [index, listing] of LISTINGS.entries()) {
      const neighborhood = neighborhoods.find(
        (each) => each.slug === listing.neighborhood,
      )

      if (!neighborhood)
        throw new Error(
          `listing "${listing.slug}" points to the neighborhood "${listing.neighborhood}", which does not exist`,
        )

      // The rank of the ad among those of its type: what rotates the pool.
      const rank = LISTINGS.slice(0, index).filter(
        (each) => each.type === listing.type,
      ).length

      await this.seed(listing, neighborhood.id, ownerId, rank, storage)
    }
  }

  private async seed(
    listing: Listing,
    neighborhoodId: string,
    ownerId: string,
    rank: number,
    storage: StorageContract,
  ) {
    const day = DateTime.fromISO(`${listing.owner.updatedAt}T12:00:00`, {
      zone: 'utc',
    })
    let verifiedAt: DateTime | null = null
    if (listing.owner.verified) verifiedAt = day

    const row = await ListingModel.updateOrCreate(
      { slug: listing.slug },
      {
        ownerId,
        status: LISTING_STATUS.PUBLISHED,
        // On the air since the day it was last touched: the sample catalog never went through the
        // review, and "since when" must not be empty for an ad that is published.
        publishedAt: day,
        type: listing.type,
        title: listing.title,
        description: listing.description,
        neighborhoodId,
        address: listing.address,
        priceMonthly: listing.price.monthly,
        priceDaily: listing.price.daily,
        costWater: listing.costs.water,
        costElectricity: listing.costs.electricity,
        costInternet: listing.costs.internet,
        periods: [...listing.periods],
        minimumStayMonths: listing.minimumStayMonths,
        availableFrom: DateTime.fromISO(listing.availableFrom),
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms,
        furnished: listing.furnished,
        rules: [...listing.rules],
        ownerName: listing.owner.name,
        ownerWhatsapp: listing.owner.whatsapp,
        ownerVerifiedAt: verifiedAt,
        lat: listing.lat,
        lng: listing.lng,
        deletedAt: null,
      },
    )

    await ListingModel.query()
      .where('id', row.id)
      .update({ createdAt: day, updatedAt: day })

    const slots = []
    for (const [position, photo] of listing.photos.entries()) {
      const pool =
        DEMO_PHOTOS[DEMO_PHOTO_POOL_BY_TYPE[listing.type][photo.environment]]
      const picture = pool[rank % pool.length]
      let storageId: string | null = null
      if (picture) storageId = await this.picture(picture, ownerId, storage)

      slots.push({
        listingId: row.id,
        position,
        environment: PHOTO_ENVIRONMENT[photo.environment],
        storageId,
      })
    }

    await ListingPhotoModel.updateOrCreateMany(['listingId', 'position'], slots)

    await ListingPhotoModel.query()
      .where('listingId', row.id)
      .where('position', '>=', listing.photos.length)
      .delete()
  }

  /**
   * The storage id of a demo picture: the one already in the bucket, or a fresh copy fetched
   * from its sources. `null` when it could not be had; the reason goes to the log, once.
   */
  private async picture(
    picture: DemoPhoto,
    ownerId: string,
    storage: StorageContract,
  ): Promise<string | null> {
    const settled = this.#pictures.get(picture.id)
    if (settled !== undefined) return settled

    const path = `demo/listings/${picture.id}.jpg`
    const id = await this.store(picture, path, ownerId, storage)
    this.#pictures.set(picture.id, id)

    return id
  }

  private async store(
    picture: DemoPhoto,
    path: string,
    ownerId: string,
    storage: StorageContract,
  ): Promise<string | null> {
    const existing = await StorageModel.query()
      .where('path', path)
      .where('status', UPLOAD_STATUS.UPLOADED)
      .withScopes((scopes) => scopes.notDeleted())
      .first()

    if (existing) {
      const metadata = await storage.metadata(path)
      if (metadata.isRight() && metadata.value) return existing.id
    }

    const bytes = await this.download(picture)
    if (!bytes) {
      logger.warn(
        `demo photo ${picture.id}: no source answered, the slot stays without a picture`,
      )
      return null
    }

    const written = await storage.put(path, bytes, STORAGE_MIMETYPE.JPEG)
    if (written.isLeft()) {
      logger.warn(
        { err: written.value },
        `demo photo ${picture.id}: the bucket refused it, the slot stays without a picture`,
      )
      return null
    }

    const row = await StorageModel.updateOrCreate(
      { path },
      {
        ownerId,
        filename: `${picture.id}.jpg`,
        originalName: `${picture.id}.jpg`,
        mimetype: STORAGE_MIMETYPE.JPEG,
        size: bytes.byteLength,
        status: UPLOAD_STATUS.UPLOADED,
        uploadId: null,
        partSize: null,
        deletedAt: null,
      },
    )

    return row.id
  }

  /**
   * The bytes of the first source that answers with a JPEG within the ceiling. The signature is
   * checked, not the `Content-Type`: a host that answers an error page with `200` would otherwise
   * put HTML in the bucket under a `.jpg`.
   */
  private async download(picture: DemoPhoto): Promise<Uint8Array | null> {
    for (const source of picture.sources) {
      try {
        const response = await fetch(source, {
          headers: { 'user-agent': 'AportaDemoSeed/1.0' },
          signal: AbortSignal.timeout(ListingSeeder.FETCH_TIMEOUT),
        })
        if (!response.ok) continue

        const bytes = new Uint8Array(await response.arrayBuffer())
        if (bytes.byteLength > ListingSeeder.MAX_BYTES) continue

        const signature = FileSignature.create(
          bytes.slice(0, FileSignature.LENGTH),
        )
        if (signature.isLeft()) continue
        if (signature.value.mimetype !== STORAGE_MIMETYPE.JPEG) continue

        return bytes
      } catch {
        // Network, DNS or timeout: the next source is the fallback.
        continue
      }
    }

    return null
  }
}
