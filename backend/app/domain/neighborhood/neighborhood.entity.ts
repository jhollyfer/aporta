import { left, right, type Either } from '@aporta/shared'

import type { NeighborhoodError } from './neighborhood.errors.ts'

/**
 * The neighborhood state. `lat` and `lng` are the approximate center of the neighborhood, for the map
 * pin: the visitor asks "near the port?", not "how many meters?" (`docs/PRD.md`).
 */
export type NeighborhoodProps = {
  readonly id: string
  readonly slug: string
  readonly name: string
  readonly lat: number
  readonly lng: number
  deletedAt: Date | null
}

export type NeighborhoodCreateInput = Omit<NeighborhoodProps, 'deletedAt'>

/**
 * The neighborhood. Thin on purpose (`_standards/domain.md` §1, "intensity proportional"): its
 * only invariants are a name and a center that exists on the globe.
 */
export default class Neighborhood {
  private constructor(private readonly props: NeighborhoodProps) {}

  static create(
    input: NeighborhoodCreateInput,
  ): Either<NeighborhoodError, Neighborhood> {
    if (input.name.trim().length === 0)
      return left({ code: 'NEIGHBORHOOD_NAME_EMPTY' })

    if (Math.abs(input.lat) > 90 || Math.abs(input.lng) > 180)
      return left({ code: 'NEIGHBORHOOD_COORDINATES_INVALID' })

    return right(new Neighborhood({ ...input, deletedAt: null }))
  }

  /** Rehydration by the repository: the data already passed the invariants when it was saved. */
  static restore(props: NeighborhoodProps): Neighborhood {
    return new Neighborhood({ ...props })
  }

  get id(): string {
    return this.props.id
  }

  snapshot(): Readonly<NeighborhoodProps> {
    return { ...this.props }
  }
}
