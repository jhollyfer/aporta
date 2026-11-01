import type { Either } from '@aporta/shared'

import UnitOfWork from '#repositories/unit-of-work/unit-of-work'

/**
 * The unit of work of the unit tests: only runs `work` (`_standards/domain.md` §6). The memory
 * repositories have no transaction to open; the rollback is proven against Postgres, in
 * `unit-of-work.e2e.spec.ts`.
 */
export default class UnitOfWorkMemory extends UnitOfWork {
  run<L, R>(work: () => Promise<Either<L, R>>): Promise<Either<L, R>> {
    return work()
  }
}
