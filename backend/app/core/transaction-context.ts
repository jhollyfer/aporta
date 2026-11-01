import { AsyncLocalStorage } from 'node:async_hooks'

import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

/**
 * The transaction of the unit of work in progress, kept per call chain in an
 * `AsyncLocalStorage` (_doc-lib/nodejs.md#api/async_context): the Lucid repositories read it
 * in `client()` and pass it as `{ client }` to the query (_doc-lib/lucid.md#transactions), so
 * they join the transaction without the use-case handing it over.
 *
 * One instance for the whole process (the provider binds it as a singleton): the store is
 * per call chain, not per instance, so concurrent requests never see each other's transaction.
 */
export default class TransactionContext {
  readonly #storage = new AsyncLocalStorage<TransactionClientContract>()

  /** The open transaction, or `undefined` outside a unit of work (the query uses the pool). */
  client(): TransactionClientContract | undefined {
    return this.#storage.getStore()
  }

  /** Runs `work` with `trx` as the transaction every repository reads. */
  run<T>(trx: TransactionClientContract, work: () => Promise<T>): Promise<T> {
    return this.#storage.run(trx, work)
  }
}
