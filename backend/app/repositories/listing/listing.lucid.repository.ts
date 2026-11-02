import {
  LISTING_PERIODS,
  SORT_DIRECTION,
  z,
  type Paginated,
  type SortDirection,
} from '@aporta/shared'

import Listing from '#domain/listing/listing.entity'
import ListingModel from '#models/listing'
import NeighborhoodModel from '#models/neighborhood'
import ListingRepository, {
  type ListingPublishedCriteria,
  type ListingRecord,
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
 */
export default class ListingLucidRepository extends ListingRepository {
  async findPublishedRecordBySlug(slug: string): Promise<ListingRecord | null> {
    const row = await this.published().where('slug', slug).first()

    if (!row) return null
    return this.toRecord(row)
  }

  async paginatePublished(
    criteria: ListingPublishedCriteria,
  ): Promise<Paginated<ListingRecord>> {
    const query = this.published()

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

    if (criteria.search) {
      const search = `%${criteria.search}%`

      query.where((builder) => {
        builder.whereILike('title', search).orWhereILike('description', search)
      })
    }

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

  private published() {
    return ListingModel.query()
      .withScopes((scopes) => scopes.published())
      .preload('neighborhood')
      .preload('photos')
  }

  private toRecord(row: ListingModel): ListingRecord {
    return {
      listing: this.toEntity(row),
      neighborhood: {
        slug: row.neighborhood.slug,
        name: row.neighborhood.name,
      },
      createdAt: row.createdAt.toJSDate(),
      updatedAt: row.updatedAt.toJSDate(),
    }
  }

  private toEntity(row: ListingModel): Listing {
    return Listing.restore({
      id: row.id,
      slug: row.slug,
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
        })),
      deletedAt: LucidMapping.date(row.deletedAt),
    })
  }
}
