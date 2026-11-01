import Translation from '#core/translation'
import type { StorageNotFound } from '#domain/storage/storage.errors'
import HTTPException from '#exceptions/http.exception'

/**
 * The translation of the profile fact that more than one action refuses in the same way
 * (`_standards/domain.md` §2): a file the payload points at that does not exist, was removed
 * or is still `PENDING`.
 *
 * `422` pointing at the payload field, never `404` or `500`, because whoever sent the wrong id
 * was the payload. The question belongs to `StorageRepository.allUploaded`; the answer is this
 * one, per resource: what is shared is the question, not the response (`backend.md` §4.1).
 *
 * The OpenAPI generator reads this file through the use-case that imports it.
 */
export default class ProfileRefusal {
  private static readonly HTTP = {
    STORAGE_NOT_FOUND: (error: StorageNotFound) =>
      HTTPException.UnprocessableEntity(
        Translation.t('errors.STORAGE_NOT_FOUND'),
        'STORAGE_NOT_FOUND',
        {
          [error.field]: Translation.t('fields.STORAGE_NOT_FOUND'),
        },
      ),
  } satisfies Record<
    StorageNotFound['code'],
    (error: StorageNotFound) => HTTPException
  >

  static http(error: StorageNotFound): HTTPException {
    return ProfileRefusal.HTTP[error.code](error)
  }
}
