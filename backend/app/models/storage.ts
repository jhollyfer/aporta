import { column, scope } from '@adonisjs/lucid/orm'
import {
  TRASHED_MODE,
  type TrashedMode,
  type UploadStatus,
} from '@aporta/shared'

import { StorageSchema } from '#database/schema'

/**
 * Neutral file record: key name, original label, type, size and
 * where the binary lives (`path`). The `url` is derived on read - never a
 * column, so that switching bucket or CDN does not require rewriting row by
 * row.
 */
export default class Storage extends StorageSchema {
  /**
   * Only what has not been archived.
   *
   * The filter is a security one, and that is why it lives in a single place: written by hand in each
   * query, it depends on someone remembering, and the query that forgets returns an
   * archived record without warning. A query that needs to see the archived one asks for
   * `trashed` on purpose, and one that does not ask cannot forget.
   */
  static notDeleted = scope((query) => {
    query.whereNull('deletedAt')
  })

  /** The cancelled upload, which stays marked until `storages:prune` deletes it. */
  static onlyDeleted = scope((query) => {
    query.whereNotNull('deletedAt')
  })

  /**
   * The `?trashed` cut as a scope, for the repository to choose by the criterion's
   * mode (`_standards/backend.md` §4.8): absent means the live ones, `only` the
   * cancelled and `with` both. _doc-lib/lucid.md#model-query-scopes.
   */
  static trashed = scope((query, mode?: TrashedMode) => {
    if (mode === TRASHED_MODE.WITH) return

    if (mode === TRASHED_MODE.ONLY) {
      query.whereNotNull('deletedAt')
      return
    }

    query.whereNull('deletedAt')
  })

  @column()
  declare status: UploadStatus

  /**
   * Redeclared because `size` is `bigint` in the database - the upload ceiling belongs to the
   * environment and exceeds `int4` -, and the driver returns `int8` as string or
   * `BigInt` depending on the path. `consume` normalizes on read, otherwise `size`
   * comes out as a string on the wire and the response validator, which declares it a number,
   * refuses its own response.
   *
   * `Number` holds it: the safe range of `double` is 2^53 bytes, nine petabytes.
   */
  @column({ consume: (value: bigint | number | string) => Number(value) })
  declare size: number
}
