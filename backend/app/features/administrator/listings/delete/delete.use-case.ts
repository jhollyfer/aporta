import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either } from '@aporta/shared'

import Translation from '#core/translation'
import type { IdentifierPayload } from '#core/validator'
import HTTPException from '#exceptions/http.exception'
import StorageOrphans from '#features/_shared.storage-orphans'
import AdministratorListingRefusal from '#features/administrator/_shared.listing-refusal'
import ListingRepository from '#repositories/listing/listing.repository'
import ReportRepository from '#repositories/report/report.repository'
import StorageRepository from '#repositories/storage/storage.repository'
import StorageContract from '#services/storage/storage.contract'

type Payload = IdentifierPayload
type Response = Either<HTTPException, null>

/**
 * Deletes an ad for good, on the administrator's say (the route is `ADMINISTRATOR` only; the
 * moderator archives but does not erase). Two refusals protect what should not go by a slip:
 * the ad has to be archived already (`Listing.ensureErasable`, `409 LISTING_NOT_ARCHIVED`), and it
 * must have no report (`409 LISTING_HAS_REPORTS`), since a report and its decision are the
 * platform's record and the `reports.listing_id` foreign key is `RESTRICT` on purpose.
 *
 * After the rows are gone, `StorageOrphans.sweep` drops the binaries **only if nothing else
 * points at them** (the demo seed shares pictures between ads). The deletion is already done and
 * is the answer: a bucket that fails is logged and left for `storages:prune`, never undone.
 */
@inject()
export default class AdministratorListingDeleteUseCase {
  constructor(
    private readonly listings: ListingRepository,
    private readonly reports: ReportRepository,
    private readonly storages: StorageRepository,
    private readonly storage: StorageContract,
  ) {}

  async execute({ id }: Payload): Promise<Response> {
    try {
      const listing = await this.listings.findAnyById(id)

      if (!listing)
        return left(
          HTTPException.NotFound(
            Translation.t('errors.LISTING_NOT_FOUND'),
            'LISTING_NOT_FOUND',
          ),
        )

      const erasable = listing.ensureErasable()

      if (erasable.isLeft())
        return left(AdministratorListingRefusal.http(erasable.value))

      if (await this.reports.existsForListing(id))
        return left(
          HTTPException.Conflict(
            Translation.t('errors.LISTING_HAS_REPORTS'),
            'LISTING_HAS_REPORTS',
          ),
        )

      const storageIds = listing
        .snapshot()
        .photos.map((photo) => photo.storageId)
        .filter((storageId) => storageId !== null)

      await this.listings.delete(listing)
      await this.sweep(storageIds)

      return right(null)
    } catch (error) {
      return left(this.failure(error))
    }
  }

  private async sweep(storageIds: ReadonlyArray<string>): Promise<void> {
    if (storageIds.length === 0) return

    try {
      const swept = await StorageOrphans.sweep(
        storageIds,
        this.storages,
        this.storage,
      )

      if (swept.isLeft())
        logger.warn(
          { err: swept.value, storageIds },
          '[administrator/listings > delete][orphan-left-behind]',
        )
    } catch (error) {
      logger.warn(
        { err: error, storageIds },
        '[administrator/listings > delete][orphan-left-behind]',
      )
    }
  }

  private failure(cause: unknown): HTTPException {
    logger.error({ err: cause }, '[administrator/listings > delete][error]')

    return HTTPException.InternalServerError(
      Translation.t('errors.ADMINISTRATOR_LISTING_DELETE_ERROR'),
      'ADMINISTRATOR_LISTING_DELETE_ERROR',
    )
  }
}
