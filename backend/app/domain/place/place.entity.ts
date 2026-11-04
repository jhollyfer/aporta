import {
  PLACE_CATEGORY,
  left,
  right,
  type Either,
  type PlaceCategory,
} from '@aporta/shared'

import type {
  PlaceAlreadyArchived,
  PlaceError,
  PlaceNotArchived,
} from './place.errors.ts'

/**
 * The guide place state. `neighborhoodId` points to another aggregate and comes in only by id
 * (`_standards/domain.md` §1). `date` is a calendar day (`YYYY-MM-DD`), not an instant: as text it
 * does not move with the reader's time zone.
 */
export type PlaceProps = {
  readonly id: string
  readonly category: PlaceCategory
  readonly name: string
  readonly description: string
  readonly neighborhoodId: string
  readonly address: string
  readonly hours: string
  readonly whatsapp: string | null
  readonly date: string | null
  deletedAt: Date | null
}

export type PlaceCreateInput = Omit<PlaceProps, 'deletedAt'>

/** What the staff can change in a place: everything but the identity and the trash. */
export type PlaceChangeInput = Omit<PlaceCreateInput, 'id'>

/** The guide place: where to eat, where to drink, what is happening, and the useful services. */
export default class Place {
  private constructor(private props: PlaceProps) {}

  static create(input: PlaceCreateInput): Either<PlaceError, Place> {
    const invalid = Place.check(input)
    if (invalid) return left(invalid)

    return right(new Place({ ...input, deletedAt: null }))
  }

  private static check(input: PlaceChangeInput): PlaceError | null {
    if (input.name.trim().length === 0) return { code: 'PLACE_NAME_EMPTY' }

    const isEvent = input.category === PLACE_CATEGORY.EVENT

    if (isEvent && input.date === null)
      return { code: 'PLACE_EVENT_DATE_REQUIRED' }

    if (!isEvent && input.date !== null)
      return { code: 'PLACE_DATE_NOT_ALLOWED' }

    if (input.date !== null && !Place.isCalendarDay(input.date))
      return { code: 'PLACE_DATE_INVALID' }

    return null
  }

  /** `YYYY-MM-DD` that survives a round trip through the calendar, so `2027-02-31` does not. */
  private static isCalendarDay(value: string): boolean {
    const parsed = new Date(`${value}T00:00:00.000Z`)

    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    )
  }

  /** Rehydration by the repository: the data already passed the invariants when it was saved. */
  static restore(props: PlaceProps): Place {
    return new Place({ ...props })
  }

  /**
   * Replaces what the staff edits, under the same invariants as `create`: moving a place out of
   * `EVENT` has to drop its date in the same step, and the entity refuses the half change.
   * Identity and the trash are not touched.
   */
  change(input: PlaceChangeInput): Either<PlaceError, Place> {
    const invalid = Place.check(input)
    if (invalid) return left(invalid)

    this.props = { ...this.props, ...input }

    return right(this)
  }

  /** Sends to the trash: the guide stops showing it, the staff list still does. */
  archive(at: Date): Either<PlaceAlreadyArchived, Place> {
    if (this.props.deletedAt !== null)
      return left({ code: 'PLACE_ALREADY_ARCHIVED' })

    this.props = { ...this.props, deletedAt: at }

    return right(this)
  }

  /** Brings it back from the trash. */
  unarchive(): Either<PlaceNotArchived, Place> {
    if (this.props.deletedAt === null)
      return left({ code: 'PLACE_NOT_ARCHIVED' })

    this.props = { ...this.props, deletedAt: null }

    return right(this)
  }

  /** Deleting for good is only for what is already in the trash (`_standards/backend.md` §4.8). */
  ensureErasable(): Either<PlaceNotArchived, Place> {
    if (this.props.deletedAt === null)
      return left({ code: 'PLACE_NOT_ARCHIVED' })

    return right(this)
  }

  get id(): string {
    return this.props.id
  }

  snapshot(): Readonly<PlaceProps> {
    return { ...this.props }
  }
}
