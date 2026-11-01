import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  right,
  type Either,
  type StorageFilePaginateResponse,
} from '@aporta/shared'

import { PAGINATION } from '#core/response'
import Translation from '#core/translation'
import HTTPException from '#exceptions/http.exception'
import { recentFirst } from '#features/_shared.sort'
import StorageFilePresenter from '#features/storage/files/files.presenter'
import StorageRepository from '#repositories/storage/storage.repository'
import StorageContract from '#services/storage/storage.contract'
import type { StorageFilePaginatePayload } from '#validators/storage/files.validator'

type Payload = StorageFilePaginatePayload
type Response = Either<HTTPException, StorageFilePaginateResponse>

/**
 * The panel file library. "Live" by the same criterion as
 * `StorageRepository.allUploaded`: diverging would make the listing offer a file
 * that the attachment refuses. The search covers the name the user recognizes, the generated
 * key and the type.
 */
@inject()
export default class StorageFilePaginateUseCase {
  constructor(
    private readonly files: StorageRepository,
    private readonly storage: StorageContract,
  ) {}

  async execute(payload: Payload): Promise<Response> {
    try {
      // `recentFirst` and not `sortOrder`: in a file library what
      // matters is what was just uploaded.
      const [sort, direction] = recentFirst(payload)

      const page = await this.files.paginate({
        page: payload.page ?? PAGINATION.PAGE,
        perPage: payload.perPage ?? PAGINATION.PER_PAGE,
        search: payload.search,
        status: payload.status,
        mimetype: payload.mimetype,
        sort,
        direction,
      })

      const data = await this.storage.signFiles(
        page.data.map((record) => StorageFilePresenter.show(record)),
      )

      return right({ meta: page.meta, data })
    } catch (error) {
      logger.error({ err: error }, '[storage/files > paginate][error]')

      return left(
        HTTPException.InternalServerError(
          Translation.t('errors.STORAGE_FILE_PAGINATE_ERROR'),
          'STORAGE_FILE_PAGINATE_ERROR',
        ),
      )
    }
  }
}
