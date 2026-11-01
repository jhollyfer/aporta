import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { left, right, type Either } from '@aporta/shared'

import Translation from '#core/translation'
import HTTPException from '#exceptions/http.exception'
import StorageRepository from '#repositories/storage/storage.repository'
import StorageContract from '#services/storage/storage.contract'

type Payload = { readonly storageId: string }
type Response = Either<HTTPException, string>

/**
 * The signed URL that delivers the file with its original name.
 *
 * Who may download is a per-record rule, and lives in `StoragePolicy`, checked in the
 * controller by `ctx.bouncer` (`_standards/backend.md` §4.6): the use-case
 * receives the already authorized id, reads the file again (the second read the
 * standard accepts) and only signs.
 */
@inject()
export default class StorageFileDownloadUseCase {
  constructor(
    private readonly files: StorageRepository,
    private readonly storage: StorageContract,
  ) {}

  async execute({ storageId }: Payload): Promise<Response> {
    try {
      const file = await this.files.findById(storageId)

      if (!file)
        return left(
          HTTPException.NotFound(
            Translation.t('errors.STORAGE_NOT_FOUND'),
            'STORAGE_NOT_FOUND',
          ),
        )

      return right(await this.storage.signedDownload(file.snapshot()))
    } catch (error) {
      logger.error({ err: error }, '[storage/files > download][error]')

      return left(
        HTTPException.InternalServerError(
          Translation.t('errors.STORAGE_FILE_DOWNLOAD_ERROR'),
          'STORAGE_FILE_DOWNLOAD_ERROR',
        ),
      )
    }
  }
}
