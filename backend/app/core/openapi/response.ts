import {
  AccountProfileShowResponse,
  AccountProfileUpdateResponse,
  StorageFileCompleteResponse,
  StorageFileCreateResponse,
  StorageFilePaginateResponse,
  StorageFilePartsResponse,
  StorageFileShowResponse,
} from '@aporta/shared'

import type { ResponseSchema } from '#core/openapi/types'

/**
 * The registry of which response schema answers for each API action
 * (`_standards/openapi.md#registro-de-resposta`). The registry **points**; the
 * schema lives in `shared/src/responses/` and is the same one the frontend uses to
 * convert the body (`_standards/architecture.md` §10).
 *
 * The key is the action's path under `app/features/`, and the lookup climbs: action
 * `storage/files/show` tries the full key and then
 * `storage/files`. A resource entry covers the actions that return the
 * same shape; one that departs from it gets its own key. `paginate` always has its
 * own: without it the listing would come out documented as the raw item, and the generator
 * leaves it without a body for `--strict` to reject.
 *
 * An action that answers `204` needs no entry: the generator does not even look.
 */
export const RESPONSES: Readonly<Record<string, ResponseSchema>> = {
  'account/profile/show': AccountProfileShowResponse,
  'account/profile/update': AccountProfileUpdateResponse,

  /**
   * `create` and `parts` answer the upload plan, not the file; `download`
   * is a bodyless redirect and declares that in the controller itself.
   */
  'storage/files': StorageFileShowResponse,
  'storage/files/complete': StorageFileCompleteResponse,
  'storage/files/create': StorageFileCreateResponse,
  'storage/files/parts': StorageFilePartsResponse,
  'storage/files/paginate': StorageFilePaginateResponse,
}
