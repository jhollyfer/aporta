import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import {
  left,
  right,
  type Either,
  type StorageFileShowResponse,
} from '@aporta/shared'

import Translation from '#core/translation'
import type { IdentifierPayload } from '#core/validator'
import HTTPException from '#exceptions/http.exception'
import StorageFilePresenter from '#features/storage/files/files.presenter'
import StorageRepository from '#repositories/storage/storage.repository'
import StorageContract from '#services/storage/storage.contract'

type Payload = IdentifierPayload
type Response = Either<HTTPException, StorageFileShowResponse>

@inject()
export default class StorageFileShowUseCase {
  constructor(
    private readonly files: StorageRepository,
    private readonly storage: StorageContract,
  ) {}

  async execute({ id }: Payload): Promise<Response> {
    try {
      // The same cut as the listing, for the same reason: it is the predicate that
      // means "live file" in `StorageRepository.allUploaded`, and diverging
      // here would show on the detail screen a file that the attachment refuses.
      const record = await this.files.findRecord(id)

      if (!record)
        return left(
          HTTPException.NotFound(
            Translation.t('errors.STORAGE_NOT_FOUND'),
            'STORAGE_NOT_FOUND',
          ),
        )

      return right(
        await this.storage.signFile(StorageFilePresenter.show(record)),
      )
    } catch (error) {
      logger.error({ err: error }, '[storage/files > show][error]')

      return left(
        HTTPException.InternalServerError(
          Translation.t('errors.STORAGE_FILE_SHOW_ERROR'),
          'STORAGE_FILE_SHOW_ERROR',
        ),
      )
    }
  }
}
