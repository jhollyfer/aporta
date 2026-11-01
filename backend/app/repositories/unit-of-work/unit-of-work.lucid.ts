import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import type { Either } from '@aporta/shared'

import TransactionContext from '#core/transaction-context'
import UnitOfWork from '#repositories/unit-of-work/unit-of-work'

/**
 * The unit of work over Lucid: a manual transaction (_doc-lib/lucid.md#transactions) because
 * the managed one only rolls back on a `throw`, and here a `left` has to roll back too.
 *
 * `finally` and not `catch`: an exception from `work` leaves with its own stack, and the
 * transaction that was not closed is rolled back on the way out.
 */
@inject()
export default class UnitOfWorkLucid extends UnitOfWork {
  constructor(private readonly transaction: TransactionContext) {
    super()
  }

  async run<L, R>(work: () => Promise<Either<L, R>>): Promise<Either<L, R>> {
    const trx = await db.transaction()

    try {
      const result = await this.transaction.run(trx, work)

      if (result.isLeft()) await trx.rollback()
      else await trx.commit()

      return result
    } finally {
      if (!trx.isCompleted) await trx.rollback()
    }
  }
}
