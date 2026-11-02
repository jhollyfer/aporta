import {
  LISTING_STATUS,
  left,
  right,
  type Either,
  type ListingPeriod,
  type ListingStatus,
  type ListingType,
  type Merge,
  type PhotoEnvironment,
} from '@aporta/shared'

import type { ListingError } from './listing.errors.ts'

/** A picture slot, in the owner's order. It has no file yet (`listing_photos` has no `storages` key). */
export type ListingPhotoProps = {
  readonly id: string
  readonly environment: PhotoEnvironment
}

/**
 * The owner as the ad carries him, denormalized on purpose: he has no account yet, and the ad is
 * what the visitor contacts. `verifiedAt` null is "not verified".
 */
export type ListingOwnerProps = {
  readonly name: string
  readonly whatsapp: string
  readonly verifiedAt: Date | null
}

/**
 * The listing state. `neighborhoodId` points to another aggregate and comes in only by id
 * (`_standards/domain.md` §1). Prices are whole reais; `availableFrom` is a calendar day
 * (`YYYY-MM-DD`), not an instant.
 */
export type ListingProps = {
  readonly id: string
  readonly slug: string
  status: ListingStatus
  readonly type: ListingType
  readonly title: string
  readonly description: string
  readonly neighborhoodId: string
  readonly address: string
  readonly priceMonthly: number | null
  readonly priceDaily: number | null
  readonly costs: {
    readonly water: boolean
    readonly electricity: boolean
    readonly internet: boolean
  }
  readonly periods: ReadonlyArray<ListingPeriod>
  readonly minimumStayMonths: number
  readonly availableFrom: string
  readonly bedrooms: number
  readonly bathrooms: number
  readonly furnished: boolean
  readonly rules: ReadonlyArray<string>
  readonly owner: ListingOwnerProps
  readonly lat: number
  readonly lng: number
  readonly photos: ReadonlyArray<ListingPhotoProps>
  deletedAt: Date | null
}

/** What creating an ad needs: everything but the state it is born with. */
export type ListingCreateInput = Merge<
  Omit<ListingProps, 'status' | 'deletedAt' | 'photos'>,
  { readonly photos?: ReadonlyArray<ListingPhotoProps> }
>

/**
 * The property ad. Born `DRAFT`, and it has to say what it costs: a monthly price, a daily one
 * (a hotel quotes only the day) or both, always in whole reais above zero.
 */
export default class Listing {
  /**
   * The month the price filter and the price sort compare against: `monthly`, or `daily` times
   * thirty when only the day is quoted. The SQL of `ListingLucidRepository` reads this constant,
   * so the rule has one number in two languages.
   */
  static readonly DAYS_PER_MONTH = 30

  private constructor(private readonly props: ListingProps) {}

  static create(input: ListingCreateInput): Either<ListingError, Listing> {
    if (input.title.trim().length === 0)
      return left({ code: 'LISTING_TITLE_EMPTY' })

    if (input.priceMonthly === null && input.priceDaily === null)
      return left({ code: 'LISTING_PRICE_REQUIRED' })

    for (const price of [input.priceMonthly, input.priceDaily]) {
      if (price !== null && (!Number.isInteger(price) || price < 1))
        return left({ code: 'LISTING_PRICE_INVALID' })
    }

    if (input.periods.length === 0)
      return left({ code: 'LISTING_PERIODS_EMPTY' })

    return right(
      new Listing({
        ...input,
        status: LISTING_STATUS.DRAFT,
        photos: input.photos ?? [],
        deletedAt: null,
      }),
    )
  }

  /** Rehydration by the repository: the data already passed the invariants when it was saved. */
  static restore(props: ListingProps): Listing {
    return new Listing({ ...props })
  }

  /** The price on a monthly scale, for ordering and for the price range. */
  monthlyEquivalent(): number {
    if (this.props.priceMonthly !== null) return this.props.priceMonthly
    return (this.props.priceDaily ?? 0) * Listing.DAYS_PER_MONTH
  }

  /** What the public storefront shows: `PUBLISHED` and outside the trash. */
  isPublished(): boolean {
    return (
      this.props.status === LISTING_STATUS.PUBLISHED &&
      this.props.deletedAt === null
    )
  }

  get id(): string {
    return this.props.id
  }

  snapshot(): Readonly<ListingProps> {
    return { ...this.props }
  }
}
