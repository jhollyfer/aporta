import type { Either } from '@aporta/shared'

/**
 * The boundary of a unit of work (`_standards/domain.md` §6): the use-case that writes in more
 * than one place asks for this contract and does not know the ORM. `work` runs inside the
 * boundary; a `right` commits what it wrote and a `left` undoes it, so a business failure
 * unwinds the writes without a `throw` (`_standards/backend.md` §4.2).
 *
 * Only for two or more writes: a single write is already atomic.
 */
export default abstract class UnitOfWork {
  abstract run<L, R>(work: () => Promise<Either<L, R>>): Promise<Either<L, R>>
}
