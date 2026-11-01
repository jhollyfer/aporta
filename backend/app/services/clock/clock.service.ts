import ClockContract from '#services/clock/clock.contract'

/** The process clock. */
export default class ClockService extends ClockContract {
  now(): Date {
    return new Date()
  }
}
