import ClockContract from '#services/clock/clock.contract'

/**
 * A stopped clock for the unit tests: `now()` always returns the same instant, and the
 * assertion compares against it instead of `Date.now()`, which changes between the action and
 * the check (`_standards/domain.md` §10).
 */
export default class ClockFake extends ClockContract {
  static readonly INSTANT = new Date('2026-01-15T12:00:00.000Z')

  now(): Date {
    return new Date(ClockFake.INSTANT)
  }
}
