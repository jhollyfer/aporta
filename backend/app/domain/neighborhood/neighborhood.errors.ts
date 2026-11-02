/**
 * The neighborhood domain facts: what the entity refuses, with no HTTP status or screen text
 * (`_standards/domain.md` §2). Slug uniqueness is a question for the repository.
 */

/** A neighborhood with no name to show. */
export type NeighborhoodNameEmpty = {
  readonly code: 'NEIGHBORHOOD_NAME_EMPTY'
}

/** A center that is not a point on the globe: the map pin would land nowhere. */
export type NeighborhoodCoordinatesInvalid = {
  readonly code: 'NEIGHBORHOOD_COORDINATES_INVALID'
}

export type NeighborhoodError =
  NeighborhoodNameEmpty | NeighborhoodCoordinatesInvalid
