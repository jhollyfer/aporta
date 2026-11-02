/**
 * The guide place domain facts: what the entity refuses, with no HTTP status or screen text
 * (`_standards/domain.md` §2).
 */

/** A place with no name to show. */
export type PlaceNameEmpty = { readonly code: 'PLACE_NAME_EMPTY' }

/** An event is a day on the calendar: without the date it is just a place. */
export type PlaceEventDateRequired = {
  readonly code: 'PLACE_EVENT_DATE_REQUIRED'
}

/** A date on a place that is not an event: a bar does not happen on a day. */
export type PlaceDateNotAllowed = { readonly code: 'PLACE_DATE_NOT_ALLOWED' }

export type PlaceError =
  PlaceNameEmpty | PlaceEventDateRequired | PlaceDateNotAllowed
