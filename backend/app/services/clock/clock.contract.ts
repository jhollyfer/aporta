/**
 * The application clock.
 *
 * A contract (`_standards/solid.md` §2, "When to create a contract": the clock is a
 * boundary) because the instant is what the test needs to pin: the entity receives
 * the `at` from outside (`_standards/domain.md` §1, domain without I/O), and the use-case
 * asks for it here. `providers/runtime.provider.ts` binds it to `ClockService`; the unit tests
 * use `ClockFake`.
 */
export default abstract class ClockContract {
  abstract now(): Date
}
