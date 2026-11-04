import {
  LISTING_PHOTOS_MAX,
  LISTING_PHOTO_MAX_SIZE,
  LISTING_PHOTO_MIMETYPES,
  LISTING_STATUS,
  REVIEW_NOTE_MAX,
  REVIEW_NOTE_MIN,
  left,
  right,
  type Either,
  type ListingPeriod,
  type ListingStatus,
  type ListingType,
  type Merge,
  type PhotoEnvironment,
} from '@aporta/shared'

import type {
  ListingAlreadyArchived,
  ListingNotArchived,
  ListingError,
  ListingPhotoNotFound,
  ListingPhotosOrderInvalid,
  ListingPhotoTooLarge,
  ListingPhotoTypeInvalid,
  ListingReviewError,
} from './listing.errors.ts'

/**
 * A picture slot, in the owner's order. `storageId` is the `storages` file it shows; null is a slot
 * with no picture yet (the seeded ones, or a file that was deleted), and the frontend draws the
 * environment instead.
 */
export type ListingPhotoProps = {
  readonly id: string
  readonly environment: PhotoEnvironment
  readonly storageId: string | null
}

/**
 * The owner as the ad carries him, denormalized on purpose: the ad is what the visitor contacts,
 * and the contact is the one the owner typed on it, not the account's. `verifiedAt` null is "not
 * verified".
 */
export type ListingOwnerProps = {
  readonly name: string
  readonly whatsapp: string
  readonly verifiedAt: Date | null
}

/**
 * The staff's last decision on the ad. `note` is the reason of a refusal and null on an approval;
 * `by` is the account that decided, null if that account was deleted since.
 */
export type ListingReviewProps = {
  readonly note: string | null
  readonly at: Date
  readonly by: string | null
}

/**
 * The listing state. `neighborhoodId` points to another aggregate and comes in only by id
 * (`_standards/domain.md` §1). Prices are whole reais; `availableFrom` is a calendar day
 * (`YYYY-MM-DD`), not an instant.
 */
export type ListingProps = {
  readonly id: string
  readonly slug: string
  /** The account that wrote the ad; null is an ad seeded before owners had accounts. */
  readonly ownerId: string | null
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
  /** When the review put the ad on the air; null until it was approved. */
  publishedAt: Date | null
  /** The last decision of the staff; null when no one reviewed it, or when an edit sent it back to the queue. */
  review: ListingReviewProps | null
  deletedAt: Date | null
}

/**
 * What an owner may change in an ad. The slug, the account and the verification are not here:
 * the address does not move under a link already shared, the account is the session's, and
 * only the platform verifies. Contact changes clear the verification (`Listing.update`).
 */
export type ListingChanges = Partial<
  Pick<
    ListingProps,
    | 'type'
    | 'title'
    | 'description'
    | 'neighborhoodId'
    | 'address'
    | 'priceMonthly'
    | 'priceDaily'
    | 'costs'
    | 'periods'
    | 'minimumStayMonths'
    | 'bedrooms'
    | 'bathrooms'
    | 'furnished'
    | 'rules'
    | 'lat'
    | 'lng'
  >
> & {
  readonly owner?: Pick<ListingOwnerProps, 'name' | 'whatsapp'>
}

/** What creating an ad needs: everything but the state it is born with. */
export type ListingCreateInput = Merge<
  Omit<
    ListingProps,
    'status' | 'deletedAt' | 'photos' | 'publishedAt' | 'review'
  >,
  { readonly photos?: ReadonlyArray<ListingPhotoProps> }
>

/**
 * The property ad. Born `DRAFT`, and it has to say what it costs: a monthly price, a daily one
 * (a hotel quotes only the day) or both, always in whole reais above zero. Whose ad it is
 * (`isOwnedBy`) is a domain fact, and the policy only asks it.
 */
export default class Listing {
  /**
   * The month the price filter and the price sort compare against: `monthly`, or `daily` times
   * thirty when only the day is quoted. The SQL of `ListingLucidRepository` reads this constant,
   * so the rule has one number in two languages.
   */
  static readonly DAYS_PER_MONTH = 30

  private constructor(private props: ListingProps) {}

  static create(input: ListingCreateInput): Either<ListingError, Listing> {
    const refusal = Listing.refusal(input)
    if (refusal) return left(refusal)

    return right(
      new Listing({
        ...input,
        status: LISTING_STATUS.DRAFT,
        photos: input.photos ?? [],
        publishedAt: null,
        review: null,
        deletedAt: null,
      }),
    )
  }

  /** Rehydration by the repository: the data already passed the invariants when it was saved. */
  static restore(props: ListingProps): Listing {
    return new Listing({ ...props })
  }

  /**
   * The invariants of what an ad says, one place for the birth and for the edit: an edit that
   * could leave the ad without a price would be a way around the rule `create` enforces.
   */
  private static refusal(
    fields: Pick<
      ListingProps,
      'title' | 'priceMonthly' | 'priceDaily' | 'periods'
    >,
  ): ListingError | null {
    if (fields.title.trim().length === 0) return { code: 'LISTING_TITLE_EMPTY' }

    if (fields.priceMonthly === null && fields.priceDaily === null)
      return { code: 'LISTING_PRICE_REQUIRED' }

    for (const price of [fields.priceMonthly, fields.priceDaily]) {
      if (price !== null && (!Number.isInteger(price) || price < 1))
        return { code: 'LISTING_PRICE_INVALID' }
    }

    if (fields.periods.length === 0) return { code: 'LISTING_PERIODS_EMPTY' }

    return null
  }

  /**
   * Hands the ad to the review: `DRAFT` becomes `PENDING`. Nothing here publishes; only the
   * team's review does, so an owner can never put his own ad on the air. The previous decision
   * is cleared: a refusal's reason is for the owner to fix the ad, and left on a `PENDING` ad it
   * would read as if the new version had been refused too.
   */
  submit(): Listing {
    if (this.props.status === LISTING_STATUS.DRAFT) {
      this.props.status = LISTING_STATUS.PENDING
      this.props.review = null
    }

    return this
  }

  /**
   * The staff puts the ad on the air: only an ad waiting in the queue (`PENDING`) can be
   * approved. An approval after another decision would rewrite who decided and when.
   */
  approve(by: string, at: Date): Either<ListingReviewError, Listing> {
    if (this.props.status !== LISTING_STATUS.PENDING)
      return left({ code: 'LISTING_NOT_PENDING' })

    this.props = {
      ...this.props,
      status: LISTING_STATUS.PUBLISHED,
      publishedAt: at,
      review: { note: null, at, by },
    }

    return right(this)
  }

  /**
   * The staff sends the ad back with the reason. It returns to `DRAFT`, which is "the owner still
   * has something to write": an edit hands it to the queue again (`submit`). The reason is part of
   * the decision and not optional, since a refusal with no reason is just a closed door.
   */
  refuse(
    note: string,
    by: string,
    at: Date,
  ): Either<ListingReviewError, Listing> {
    if (this.props.status !== LISTING_STATUS.PENDING)
      return left({ code: 'LISTING_NOT_PENDING' })

    const reason = note.trim()
    if (reason.length < REVIEW_NOTE_MIN || reason.length > REVIEW_NOTE_MAX)
      return left({ code: 'LISTING_REVIEW_NOTE_INVALID' })

    this.props = {
      ...this.props,
      status: LISTING_STATUS.DRAFT,
      review: { note: reason, at, by },
    }

    return right(this)
  }

  /** Whether the account is the one that wrote the ad. An ad with no account belongs to no one. */
  isOwnedBy(accountId: string): boolean {
    return this.props.ownerId !== null && this.props.ownerId === accountId
  }

  /**
   * Applies what the owner changed, absent fields untouched, and checks the invariants again on
   * the result. The status stays where it is. Changing the contact clears the verification: the
   * team confirmed the person behind a number, and a new number is a new person until confirmed.
   */
  update(changes: ListingChanges): Either<ListingError, Listing> {
    const { owner, ...fields } = changes
    const next: ListingProps = {
      ...this.props,
      ...fields,
      owner: this.ownerAfter(owner),
    }

    const refusal = Listing.refusal(next)
    if (refusal) return left(refusal)

    this.props = next

    return right(this)
  }

  private ownerAfter(
    contact: Pick<ListingOwnerProps, 'name' | 'whatsapp'> | undefined,
  ): ListingOwnerProps {
    if (!contact) return this.props.owner

    const same =
      contact.name === this.props.owner.name &&
      contact.whatsapp === this.props.owner.whatsapp
    if (same) return this.props.owner

    return { name: contact.name, whatsapp: contact.whatsapp, verifiedAt: null }
  }

  /**
   * Whether a finished file may be a listing photo: JPEG, PNG or WebP, up to
   * `LISTING_PHOTO_MAX_SIZE`. Asked of each file before `attachPhotos`, because the generic
   * upload (`POST /storages`) accepts more types and a bigger ceiling than a photo of a room
   * needs, and only here is it known that the file is going to be a photo.
   */
  static checkPhotoFile(file: {
    readonly mimetype: string
    readonly size: number
  }): Either<ListingPhotoTypeInvalid | ListingPhotoTooLarge, null> {
    if (!LISTING_PHOTO_MIMETYPES.some((type) => type === file.mimetype))
      return left({ code: 'LISTING_PHOTO_TYPE_INVALID' })

    if (file.size > LISTING_PHOTO_MAX_SIZE)
      return left({ code: 'LISTING_PHOTO_TOO_LARGE' })

    return right(null)
  }

  /**
   * Puts pictures at the end of the gallery, in the order given. The ceiling is the whole ad's,
   * not the call's: two calls of ten would otherwise slip past a ceiling of twelve. A file already
   * in the gallery, or twice in the call, is refused: it would fill two slots with one picture.
   */
  attachPhotos(
    photos: ReadonlyArray<ListingPhotoProps>,
  ): Either<ListingError, Listing> {
    if (this.props.photos.length + photos.length > LISTING_PHOTOS_MAX)
      return left({ code: 'LISTING_PHOTOS_LIMIT' })

    const keys = [...this.props.photos, ...photos]
      .map((photo) => photo.storageId)
      .filter((storageId) => storageId !== null)
    if (new Set(keys).size !== keys.length)
      return left({ code: 'LISTING_PHOTO_DUPLICATED' })

    this.props = { ...this.props, photos: [...this.props.photos, ...photos] }

    return right(this)
  }

  /**
   * Takes one picture out of the gallery and hands it back, so the caller knows which file was
   * let go of. The ones after it move up: the position is the index in the gallery, so there is
   * no gap to close. A photo the gallery does not have (already removed, or from another ad) is
   * refused instead of ignored. Like `attachPhotos`, it leaves the status where it is.
   */
  removePhoto(
    photoId: string,
  ): Either<ListingPhotoNotFound, ListingPhotoProps> {
    const removed = this.props.photos.find((photo) => photo.id === photoId)

    if (!removed) return left({ code: 'LISTING_PHOTO_NOT_FOUND' })

    this.props = {
      ...this.props,
      photos: this.props.photos.filter((photo) => photo.id !== photoId),
    }

    return right(removed)
  }

  /**
   * Puts the gallery in the order given, by photo id. It has to be **exactly** the photos the ad
   * has: none missing, none extra, none twice. Anything else would be a way to add or drop a
   * picture through a route that only moves them. The first one is the cover of the ad.
   */
  reorderPhotos(
    ids: ReadonlyArray<string>,
  ): Either<ListingPhotosOrderInvalid, Listing> {
    const current = new Map(this.props.photos.map((photo) => [photo.id, photo]))
    const sorted: ListingPhotoProps[] = []

    for (const id of new Set(ids)) {
      const photo = current.get(id)

      if (photo) sorted.push(photo)
    }

    // A repeated or foreign id leaves `sorted` shorter than `ids`; a missing one, shorter than the gallery.
    if (sorted.length !== ids.length || ids.length !== current.size)
      return left({ code: 'LISTING_PHOTOS_ORDER_INVALID' })

    this.props = { ...this.props, photos: sorted }

    return right(this)
  }

  /**
   * Takes the ad off the air: `ARCHIVED` and into the trash, in one transition, because the
   * storefront cut reads both and an ad half archived is one the visitor still finds.
   */
  archive(at: Date): Either<ListingAlreadyArchived, Listing> {
    if (this.props.deletedAt !== null)
      return left({ code: 'LISTING_ALREADY_ARCHIVED' })

    this.props = {
      ...this.props,
      status: LISTING_STATUS.ARCHIVED,
      deletedAt: at,
    }

    return right(this)
  }

  /**
   * The rule of deleting for good: only an ad that already left the air (`ARCHIVED` and in the
   * trash) may go, so a published one is never erased by a slip. The entity does not change: the
   * removal itself is the repository's (`_standards/backend.md` §4.8, `delete` refuses
   * what is not archived with `409`).
   */
  ensureErasable(): Either<ListingNotArchived, Listing> {
    if (
      this.props.status !== LISTING_STATUS.ARCHIVED ||
      this.props.deletedAt === null
    )
      return left({ code: 'LISTING_NOT_ARCHIVED' })

    return right(this)
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
