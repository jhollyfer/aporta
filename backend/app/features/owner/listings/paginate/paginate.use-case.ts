import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  right,
  type Actor,
  type Either,
  type Merge,
  type OwnerListingPaginateResponse,
} from '@aporta/shared'

import { PAGINATION } from '#core/response'
import Translation from '#core/translation'
import HTTPException from '#exceptions/http.exception'
import ListingPhotoUrls from '#features/_shared.listing-photo-urls'
import { recentFirst } from '#features/_shared.sort'
import ListingPresenter from '#features/owner/_shared.listing.presenter'
import ListingRepository from '#repositories/listing/listing.repository'
import StorageContract from '#services/storage/storage.contract'
import type { OwnerListingPaginatePayload } from '#validators/owner/listings.validator'

type Payload = Merge<OwnerListingPaginatePayload, { readonly actor: Actor }>
type Response = Either<HTTPException, OwnerListingPaginateResponse>

/**
 * The owner's own ads. The account is the `actor`'s, put into the criteria and applied inside the
 * query (`ListingRepository.paginateOwned`): an ad of another account is not read and denied
 * afterwards, it is never read.
 */
@inject()
export default class OwnerListingPaginateUseCase {
  constructor(
    private readonly listings: ListingRepository,
    private readonly storage: StorageContract,
  ) {}

  async execute({ actor, ...payload }: Payload): Promise<Response> {
    try {
      // `recentFirst` and not `sortOrder`: an owner looks for the ad he just wrote.
      const [sort, direction] = recentFirst(payload)

      const page = await this.listings.paginateOwned({
        ownerId: actor.id,
        page: payload.page ?? PAGINATION.PAGE,
        perPage: payload.perPage ?? PAGINATION.PER_PAGE,
        search: payload.search,
        status: payload.status,
        sort,
        direction,
      })
      const urls = await ListingPhotoUrls.sign(page.data, this.storage)

      return right({
        meta: page.meta,
        data: page.data.map((record) => ListingPresenter.show(record, urls)),
      })
    } catch (error) {
      logger.error({ err: error }, '[owner/listings > paginate][error]')

      return left(
        HTTPException.InternalServerError(
          Translation.t('errors.OWNER_LISTING_PAGINATE_ERROR'),
          'OWNER_LISTING_PAGINATE_ERROR',
        ),
      )
    }
  }
}
