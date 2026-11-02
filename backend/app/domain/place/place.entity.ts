import {
  PLACE_CATEGORY,
  left,
  right,
  type Either,
  type PlaceCategory,
} from '@aporta/shared'

import type { PlaceError } from './place.errors.ts'

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

/** The guide place: where to eat, where to drink, what is happening, and the useful services. */
export default class Place {
  private constructor(private readonly props: PlaceProps) {}

  static create(input: PlaceCreateInput): Either<PlaceError, Place> {
    if (input.name.trim().length === 0)
      return left({ code: 'PLACE_NAME_EMPTY' })

    const isEvent = input.category === PLACE_CATEGORY.EVENT

    if (isEvent && input.date === null)
      return left({ code: 'PLACE_EVENT_DATE_REQUIRED' })

    if (!isEvent && input.date !== null)
      return left({ code: 'PLACE_DATE_NOT_ALLOWED' })

    return right(new Place({ ...input, deletedAt: null }))
  }

  /** Rehydration by the repository: the data already passed the invariants when it was saved. */
  static restore(props: PlaceProps): Place {
    return new Place({ ...props })
  }

  get id(): string {
    return this.props.id
  }

  snapshot(): Readonly<PlaceProps> {
    return { ...this.props }
  }
}
