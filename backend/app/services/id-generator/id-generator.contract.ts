/**
 * Where the id of a new record comes from.
 *
 * The entity is born with the id already chosen (`_standards/domain.md` §1: generated
 * outside it and passed in `create`), and randomness is a boundary
 * (`_standards/solid.md` §2): the unit tests swap in `IdGeneratorFake` and know in
 * advance which id will come out. `providers/runtime.provider.ts` binds it to
 * `IdGeneratorService`.
 */
export default abstract class IdGeneratorContract {
  abstract next(): string
}
