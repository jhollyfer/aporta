import type { ApplicationService } from '@adonisjs/core/types'

import TransactionContext from '#core/transaction-context'
import ListingRepository from '#repositories/listing/listing.repository'
import NeighborhoodRepository from '#repositories/neighborhood/neighborhood.repository'
import PlaceRepository from '#repositories/place/place.repository'
import ReportRepository from '#repositories/report/report.repository'
import SessionTokenRepository from '#repositories/session-token/session-token.repository'
import StorageRepository from '#repositories/storage/storage.repository'
import UnitOfWork from '#repositories/unit-of-work/unit-of-work'
import UserRepository from '#repositories/user/user.repository'

/**
 * The repositories composition root (`_standards/solid.md` §2): the use-case
 * asks for the contract, and it is only here that it becomes the Lucid implementation. The unit
 * tests do not pass through here: they build the use-case with the in-memory implementation.
 *
 * `bind` and not `singleton`: the repository keeps no state or connection (the pool
 * belongs to Lucid), so one instance per resolution costs nothing. Dynamic
 * import, as in `storage.provider.ts`: the implementation loads the model, and
 * `register` runs before Lucid boots.
 *
 * _doc-lib/adonisjs.md#guides/concepts/dependency-injection ("Abstract classes as
 * interfaces", "Bindings") and #guides/concepts/service-providers ("The register
 * hook").
 */
export default class RepositoryProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    // One for the process: the repositories and the unit of work must read the same context.
    this.app.container.singleton(
      TransactionContext,
      () => new TransactionContext(),
    )
    this.app.container.bind(UnitOfWork, async (resolver) => {
      const { default: UnitOfWorkLucid } =
        await import('#repositories/unit-of-work/unit-of-work.lucid')
      return resolver.make(UnitOfWorkLucid)
    })
    this.app.container.bind(ListingRepository, async (resolver) => {
      const { default: ListingLucidRepository } =
        await import('#repositories/listing/listing.lucid.repository')
      return resolver.make(ListingLucidRepository)
    })
    this.app.container.bind(NeighborhoodRepository, async (resolver) => {
      const { default: NeighborhoodLucidRepository } =
        await import('#repositories/neighborhood/neighborhood.lucid.repository')
      return resolver.make(NeighborhoodLucidRepository)
    })
    this.app.container.bind(PlaceRepository, async (resolver) => {
      const { default: PlaceLucidRepository } =
        await import('#repositories/place/place.lucid.repository')
      return resolver.make(PlaceLucidRepository)
    })
    this.app.container.bind(ReportRepository, async (resolver) => {
      const { default: ReportLucidRepository } =
        await import('#repositories/report/report.lucid.repository')
      return resolver.make(ReportLucidRepository)
    })
    this.app.container.bind(SessionTokenRepository, async (resolver) => {
      const { default: SessionTokenLucidRepository } =
        await import('#repositories/session-token/session-token.lucid.repository')
      return resolver.make(SessionTokenLucidRepository)
    })
    this.app.container.bind(StorageRepository, async (resolver) => {
      const { default: StorageLucidRepository } =
        await import('#repositories/storage/storage.lucid.repository')
      return resolver.make(StorageLucidRepository)
    })
    this.app.container.bind(UserRepository, async (resolver) => {
      const { default: UserLucidRepository } =
        await import('#repositories/user/user.lucid.repository')
      return resolver.make(UserLucidRepository)
    })
  }
}
