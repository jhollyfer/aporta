import { DateTime } from 'luxon'

/**
 * The API response envelope, backend side (`_standards/architecture.md`
 * §3 and §10).
 *
 * The shape lives in `@aporta/shared` (`shared/src/responses/envelope.ts`), the
 * same one the frontend uses to convert the body: here the type is only re-exported,
 * so use-cases and the exception handler do not repeat the declaration.
 *
 * `Paginated<T>` is what a listing builds with
 * `{ meta: paginator.getMeta(), data: paginator.all() }`: `all()` keeps `T[]`,
 * and the `any` of `getMeta()` dies at this boundary - the raw paginator would type the
 * response as the class, with `serialize`, `toJSON` and 55 more members.
 */
export type { ErrorEnvelope, Paginated, PaginationMeta } from '@aporta/shared'

/**
 * The pagination defaults, in one place: the page and size a listing uses
 * when the client does not ask.
 *
 * Here, next to `Paginated<T>`, and not in `validator.ts`, because this is a
 * read default, not an input rule. The ceiling the client may ask for
 * stays in the validator, which is where it is enforced.
 */
export const PAGINATION = { PAGE: 1, PER_PAGE: 20 } as const

/**
 * Instant on the wire: the text Luxon's `toJSON()` produces (`toISO()`, with the
 * process time zone offset), the same one Lucid put in the response when
 * serializing the column. The presenter receives a `Date` from the entity and returns this, and
 * the response format does not change when swapping the model for the entity
 * (the shared `ResponseRule.datetime()` accepts `Z` and `±hh:mm`).
 */
export class WireDate {
  static iso(value: Date): string {
    const text = DateTime.fromJSDate(value).toISO()
    if (text === null) return value.toISOString()
    return text
  }

  /**
   * The calendar day (`YYYY-MM-DD`) of an instant, read in UTC: the same instant is the same day
   * on every server, whatever the time zone of the process. For what the page shows as "updated
   * on".
   */
  static day(value: Date): string {
    return value.toISOString().slice(0, 10)
  }

  static isoOrNull(value: Date | null): string | null {
    if (value === null) return null
    return WireDate.iso(value)
  }
}
