import db from '@adonisjs/lucid/services/db'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import {
  LISTING_PERIODS,
  SORT_DIRECTION,
  UPLOAD_STATUS,
  left,
  right,
  z,
  type Either,
  type Paginated,
  type SortDirection,
  type StorageFileShowResponse,
} from '@aporta/shared'

import RepositoryFailure from '#core/repository-failure'
import type { UniqueConflict } from '#core/unique-conflict'
import Listing, { type ListingProps } from '#domain/listing/listing.entity'
import ListingModel from '#models/listing'
import ListingPhotoModel from '#models/listing-photo'
import NeighborhoodModel from '#models/neighborhood'
import ListingRepository, {
  type ListingOwnedCriteria,
  type ListingPinsCriteria,
  type ListingPinsResult,
  type ListingPublishedCriteria,
  type ListingPublishedFilters,
  type ListingRecord,
  type ListingReviewCriteria,
} from '#repositories/listing/listing.repository'
import LucidMapping from '#repositories/shared/lucid-mapping'

/**
 * The monthly equivalent of the price, in SQL: the same rule as `Listing.monthlyEquivalent`, and
 * the number of days comes from the entity's constant so there is one `30` in two languages. Only
 * a number is interpolated; every value the visitor sends goes through a binding.
 */
const MONTHLY_EQUIVALENT = `COALESCE(listings.price_monthly, listings.price_daily * ${Listing.DAYS_PER_MONTH})`

/**
 * A lookup and not the raw `direction`: the value is already a closed enum by the time it gets here,
 * but this is the clause that composes SQL, and an interpolation is only safe if the table is what
 * decides what gets interpolated.
 */
const DIRECTION_SQL = {
  [SORT_DIRECTION.ASC]: 'asc',
  [SORT_DIRECTION.DESC]: 'desc',
} as const satisfies Record<SortDirection, string>

/** What the database hands the driver for a `text[]`, checked on the way into the entity. */
const Periods = z.array(z.enum(LISTING_PERIODS))

/**
 * The listing repository over Lucid: the only file that imports `#models/listing`
 * (`_standards/architecture.md` §2), with the mapper as a private method
 * (`_standards/domain.md` §5.2).
 *
 * The storefront cut is the model's `published` scope (status **and** trash), applied in one place
 * for both reads, so a query that forgets it cannot exist. The neighborhood and the photos come
 * preloaded, the photos sorted by `position` on the way into the entity: a card is never drawn without them.
 *
 * The `OR` of the search goes inside its own `where`: loose, it would cancel the status filter, and
 * a draft would reach whoever typed a word from its title.
 *
 * The owner's reads are cut to the live rows (`notDeleted`) and, for the list, to the account in
 * the same query. `save` writes the row and the photos in one transaction: the photos are replaced
 * as a set, so a failure in the second step cannot leave an ad with half a gallery.
 */
export default class ListingLucidRepository extends ListingRepository {
  async findById(id: string): Promise<Listing | null> {
    const row = await this.live().where('id', id).first()

    if (!row) return null
    return this.toEntity(row)
  }

  async findRecordById(id: string): Promise<ListingRecord | null> {
    const row = await this.live().where('id', id).first()

    if (!row) return null
    return this.toRecord(row)
  }

  async findAnyById(id: string): Promise<Listing | null> {
    const row = await this.withRelations(ListingModel.query())
      .where('id', id)
      .first()

    if (!row) return null
    return this.toEntity(row)
  }

  async findAnyRecordById(id: string): Promise<ListingRecord | null> {
    const row = await this.withRelations(ListingModel.query())
      .where('id', id)
      .first()

    if (!row) return null
    return this.toRecord(row)
  }

  async paginateForReview(
    criteria: ListingReviewCriteria,
  ): Promise<Paginated<ListingRecord>> {
    const query = this.withRelations(ListingModel.query())

    if (criteria.status) query.where('status', criteria.status)

    if (criteria.search) {
      const search = `%${criteria.search}%`

      query.where((builder) => {
        builder.whereILike('title', search).orWhereILike('description', search)
      })
    }

    if (criteria.sort === 'price') {
      query.orderByRaw(
        `${MONTHLY_EQUIVALENT} ${DIRECTION_SQL[criteria.direction]}`,
      )

      return LucidMapping.page(query, { ...criteria, sort: 'id' }, (row) =>
        this.toRecord(row),
      )
    }

    return LucidMapping.page(query, criteria, (row) => this.toRecord(row))
  }

  async paginateOwned(
    criteria: ListingOwnedCriteria,
  ): Promise<Paginated<ListingRecord>> {
    const query = this.live().where('ownerId', criteria.ownerId)

    if (criteria.status) query.where('status', criteria.status)

    if (criteria.search) {
      const search = `%${criteria.search}%`

      query.where((builder) => {
        builder.whereILike('title', search).orWhereILike('description', search)
      })
    }

    if (criteria.sort === 'price') {
      query.orderByRaw(
        `${MONTHLY_EQUIVALENT} ${DIRECTION_SQL[criteria.direction]}`,
      )

      return LucidMapping.page(query, { ...criteria, sort: 'id' }, (row) =>
        this.toRecord(row),
      )
    }

    return LucidMapping.page(query, criteria, (row) => this.toRecord(row))
  }

  async save(
    listing: Listing,
  ): Promise<Either<UniqueConflict | RepositoryFailure, ListingRecord>> {
    const saved = await LucidMapping.unlessUnique(this.persist(listing))

    if (saved.isLeft()) return left(saved.value)
    if (saved.value) return right(saved.value)

    // The row was just written in the same call: not finding it is an infrastructure failure.
    return left(
      RepositoryFailure.of(
        new Error(`listing ${listing.id} vanished after save`),
      ),
    )
  }

  async delete(listing: Listing): Promise<void> {
    // The photos go with it by `ON DELETE CASCADE`; the same call in memory drops the row.
    await ListingModel.query().where('id', listing.id).delete()
  }

  private async persist(listing: Listing): Promise<ListingRecord | null> {
    const snapshot = listing.snapshot()

    await db.transaction(async (trx) => {
      const row = await ListingModel.updateOrCreate(
        { id: snapshot.id },
        this.toRow(listing),
        { client: trx },
      )

      // The set is rewritten, not patched: positions are `UNIQUE` per ad, and an update that
      // moved one photo onto another's position would trip the index halfway through.
      await ListingPhotoModel.query({ client: trx })
        .where('listingId', row.id)
        .delete()

      await ListingPhotoModel.createMany(
        snapshot.photos.map((photo, position) => ({
          id: photo.id,
          listingId: row.id,
          environment: photo.environment,
          storageId: photo.storageId,
          position,
        })),
        { client: trx },
      )
    })

    // Read without the trash cut: an archive is a save too, and it has to answer with the row
    // as it was written instead of failing on the row it just moved to the trash.
    const saved = await this.withRelations(ListingModel.query())
      .where('id', snapshot.id)
      .first()

    if (!saved) return null
    return this.toRecord(saved)
  }

  async findPublishedRecordBySlug(slug: string): Promise<ListingRecord | null> {
    const row = await this.published().where('slug', slug).first()

    if (!row) return null
    return this.toRecord(row)
  }

  async paginatePublished(
    criteria: ListingPublishedCriteria,
  ): Promise<Paginated<ListingRecord>> {
    const query = this.narrow(this.published(), criteria)

    // `price` is not a column, so it is the expression that orders. `id` goes after it as the
    // tie-break: two ads with the same price would otherwise swap places between pages.
    if (criteria.sort === 'price') {
      query.orderByRaw(
        `${MONTHLY_EQUIVALENT} ${DIRECTION_SQL[criteria.direction]}`,
      )

      return LucidMapping.page(query, { ...criteria, sort: 'id' }, (row) =>
        this.toRecord(row),
      )
    }

    return LucidMapping.page(query, criteria, (row) => this.toRecord(row))
  }

  async findPublishedPins(
    criteria: ListingPinsCriteria,
  ): Promise<ListingPinsResult> {
    // No relations: a pin is one row of `listings`. The count and the points share the filters
    // through `narrow`, so "how many match" can never disagree with "which ones came back".
    const total = await LucidMapping.count(
      this.narrow(
        ListingModel.query().withScopes((scopes) => scopes.published()),
        criteria,
      ),
    )
    const rows = await this.narrow(
      ListingModel.query().withScopes((scopes) => scopes.published()),
      criteria,
    )
      .select('id', 'slug', 'type', 'lat', 'lng', 'priceMonthly', 'priceDaily')
      .orderBy('createdAt', 'desc')
      .orderBy('id', 'asc')
      .limit(criteria.limit)

    return {
      total,
      pins: rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        type: row.type,
        lat: row.lat,
        lng: row.lng,
        priceMonthly: row.priceMonthly,
        priceDaily: row.priceDaily,
      })),
    }
  }

  /**
   * The storefront filters, applied once for the catalog and for the pins. Every value the visitor
   * sends goes through a binding; the only interpolation is `MONTHLY_EQUIVALENT`, a constant.
   */
  private narrow(
    query: ModelQueryBuilderContract<typeof ListingModel, ListingModel>,
    criteria: ListingPublishedFilters,
  ) {
    if (criteria.type) query.where('type', criteria.type)

    // A subquery on the slug and not `whereHas`: the relation's callback hands back a thenable
    // builder, which the house lint refuses as a floating promise, and the `IN` reads the same.
    if (criteria.neighborhood)
      query.whereIn(
        'neighborhoodId',
        NeighborhoodModel.query()
          .where('slug', criteria.neighborhood)
          .select('id'),
      )

    // `= ANY` and not `@>`: the question is "is the period among the ones the ad offers".
    if (criteria.period)
      query.whereRaw('? = ANY(listings.periods)', [criteria.period])

    if (criteria.minPrice !== undefined)
      query.whereRaw(`${MONTHLY_EQUIVALENT} >= ?`, [criteria.minPrice])

    if (criteria.maxPrice !== undefined)
      query.whereRaw(`${MONTHLY_EQUIVALENT} <= ?`, [criteria.maxPrice])

    // `between` is inclusive, so a pin exactly on the edge of the window is inside it.
    if (criteria.bounds) {
      query
        .whereBetween('lat', [criteria.bounds.minLat, criteria.bounds.maxLat])
        .whereBetween('lng', [criteria.bounds.minLng, criteria.bounds.maxLng])
    }

    if (criteria.search) {
      const search = `%${criteria.search}%`

      query.where((builder) => {
        builder.whereILike('title', search).orWhereILike('description', search)
      })
    }

    return query
  }

  private published() {
    return this.withRelations(
      ListingModel.query().withScopes((scopes) => scopes.published()),
    )
  }

  private live() {
    return this.withRelations(
      ListingModel.query().withScopes((scopes) => scopes.notDeleted()),
    )
  }

  private withRelations(
    query: ModelQueryBuilderContract<typeof ListingModel, ListingModel>,
  ) {
    return (
      query
        .preload('neighborhood')
        .preload('owner')
        // The callback only configures the nested preload; the query runs with the parent's, so the
        // builder it returns is not a promise anyone awaits.
        .preload('photos', (photos) => {
          void photos.preload('storage')
        })
    )
  }

  private toRecord(row: ListingModel): ListingRecord {
    return {
      listing: this.toEntity(row),
      neighborhood: {
        slug: row.neighborhood.slug,
        name: row.neighborhood.name,
      },
      account: this.accountOf(row),
      ownerVerifiedAt: this.sealOf(row),
      files: this.filesOf(row),
      createdAt: row.createdAt.toJSDate(),
      updatedAt: row.updatedAt.toJSDate(),
    }
  }

  /** The account behind the ad, when there is one. `owner` is preloaded, and null for `owner_id` null. */
  private accountOf(row: ListingModel): ListingRecord['account'] {
    if (!row.owner) return null

    return {
      id: row.owner.id,
      name: row.owner.name,
      email: row.owner.email,
      verifiedAt: LucidMapping.date(row.owner.verifiedAt),
    }
  }

  /** The account's seal when the ad has an account, the ad's own column only when it has none. */
  private sealOf(row: ListingModel): Date | null {
    if (row.owner) return LucidMapping.date(row.owner.verifiedAt)

    return LucidMapping.date(row.ownerVerifiedAt)
  }

  /**
   * The files the photos show, only the ones a visitor may be given: `UPLOADED` and outside the
   * trash. A cancelled or half-sent file keeps the slot and loses the picture.
   */
  private filesOf(row: ListingModel): StorageFileShowResponse[] {
    const files: StorageFileShowResponse[] = []

    for (const photo of row.photos) {
      const storage = photo.storage
      if (!storage) continue
      if (storage.status !== UPLOAD_STATUS.UPLOADED) continue
      if (storage.deletedAt !== null) continue

      const file = LucidMapping.file(storage)
      if (file) files.push(file)
    }

    return files
  }

  /** The columns the entity decides; the time stamps belong to the model. */
  private toRow(listing: Listing) {
    const snapshot = listing.snapshot()

    return {
      slug: snapshot.slug,
      ownerId: snapshot.ownerId,
      status: snapshot.status,
      publishedAt: LucidMapping.dateTime(snapshot.publishedAt),
      reviewNote: snapshot.review?.note ?? null,
      reviewedAt: LucidMapping.dateTime(snapshot.review?.at ?? null),
      reviewedBy: snapshot.review?.by ?? null,
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
      availableFrom: LucidMapping.fromCalendarDate(snapshot.availableFrom),
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
    }
  }

  private toEntity(row: ListingModel): Listing {
    return Listing.restore({
      id: row.id,
      slug: row.slug,
      ownerId: row.ownerId,
      status: row.status,
      type: row.type,
      title: row.title,
      description: row.description,
      neighborhoodId: row.neighborhoodId,
      address: row.address,
      priceMonthly: row.priceMonthly,
      priceDaily: row.priceDaily,
      costs: {
        water: row.costWater,
        electricity: row.costElectricity,
        internet: row.costInternet,
      },
      periods: Periods.parse(row.periods),
      minimumStayMonths: row.minimumStayMonths,
      availableFrom: LucidMapping.calendarDate(row.availableFrom),
      bedrooms: row.bedrooms,
      bathrooms: row.bathrooms,
      furnished: row.furnished,
      rules: row.rules,
      owner: {
        name: row.ownerName,
        whatsapp: row.ownerWhatsapp,
        verifiedAt: LucidMapping.date(row.ownerVerifiedAt),
      },
      lat: row.lat,
      lng: row.lng,
      // By `position`, the order the owner chose: the preload carries no order of its own.
      photos: row.photos
        .toSorted((a, b) => a.position - b.position)
        .map((photo) => ({
          id: photo.id,
          environment: photo.environment,
          storageId: photo.storageId,
        })),
      publishedAt: LucidMapping.date(row.publishedAt),
      review: this.reviewOf(row),
      deletedAt: LucidMapping.date(row.deletedAt),
    })
  }

  /** The decision, or none: `reviewed_at` is what says a review happened (note and author may be null). */
  private reviewOf(row: ListingModel): ListingProps['review'] {
    const at = LucidMapping.date(row.reviewedAt)
    if (!at) return null

    return { note: row.reviewNote, at, by: row.reviewedBy }
  }
}
