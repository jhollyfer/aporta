import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import {
  UPLOAD_STATUS,
  z,
  type Paginated,
  type TrashedMode,
} from '@aporta/shared'
import { DateTime } from 'luxon'

import TransactionContext from '#core/transaction-context'
import Storage from '#domain/storage/storage.entity'
import StorageModel from '#models/storage'
import LucidMapping from '#repositories/shared/lucid-mapping'
import StorageRepository, {
  STORAGE_REFERENCE,
  type StorageReference,
  type StorageListCriteria,
  type StorageRecord,
} from '#repositories/storage/storage.repository'

/**
 * Every column that points to `storages`, with the identifier the use-case
 * translates when the file is in use (`_standards/backend.md` §4.9: cross
 * FK reference is a declarative table inside the repository).
 *
 * A single list of objects, and not lists matched by index. `db.from` for
 * all: a pivot has no model, and a single shape avoids two different readings of the
 * same question. Every reference to
 * `storages` is `SET NULL` or `CASCADE`, so the database would prevent nothing: a
 * column missing here is a file in use that vanishes without warning.
 */
/** What `count('* as total')` answers: Postgres `bigint` reaches the driver as text. */
const TotalRows = z.array(z.object({ total: z.coerce.number() }))

const REFERENCES = [
  {
    table: 'users',
    column: 'avatar_id',
    reference: STORAGE_REFERENCE.USER_AVATAR,
  },
] as const

/**
 * The file repository over Lucid: the only file in `repositories/`
 * that imports `#models/storage` as a value (`_standards/architecture.md` §2),
 * with the mapper as a private method (`_standards/domain.md` §5.2).
 *
 * The queries are the ones the use-cases used to do (`_standards/backend.md` §11.1,
 * step 2): "live" is `notDeleted`, the same predicate as
 * `allUploaded`, and the search covers original name, key and type
 * with the `OR` inside the `where`. `save` uses `updateOrCreate`
 * (_doc-lib/lucid.md#crud-operations).
 */
@inject()
export default class StorageLucidRepository extends StorageRepository {
  constructor(private readonly transaction: TransactionContext) {
    super()
  }

  async findById(id: string, trashed?: TrashedMode): Promise<Storage | null> {
    const row = await StorageModel.query()
      .where('id', id)
      .withScopes((scopes) => scopes.trashed(trashed))
      .first()

    if (!row) return null
    return this.toEntity(row)
  }

  async findRecord(id: string): Promise<StorageRecord | null> {
    const row = await StorageModel.query()
      .where('id', id)
      .withScopes((scopes) => scopes.notDeleted())
      .first()

    if (!row) return null
    return this.toRecord(row)
  }

  async paginate(
    criteria: StorageListCriteria,
  ): Promise<Paginated<StorageRecord>> {
    const query = StorageModel.query().withScopes((scopes) =>
      scopes.notDeleted(),
    )

    if (criteria.status) query.where('status', criteria.status)
    if (criteria.mimetype) query.where('mimetype', criteria.mimetype)

    // The `OR` goes inside the `where`: loose, the search would cancel the status filter.
    if (criteria.search) {
      const search = `%${criteria.search}%`

      query.where((builder) => {
        builder
          .whereILike('originalName', search)
          .orWhereILike('filename', search)
          .orWhereILike('mimetype', search)
      })
    }

    return LucidMapping.page(query, criteria, (row) => this.toRecord(row))
  }

  async references(id: string): Promise<StorageReference[]> {
    const counts = await Promise.all(
      REFERENCES.map(async (reference) => {
        const rows: unknown = await db
          .from(reference.table)
          .where(reference.column, id)
          .count('* as total')

        return TotalRows.parse(rows)
      }),
    )

    const found: StorageReference[] = []

    for (const [index, reference] of REFERENCES.entries()) {
      if ((counts[index]?.[0]?.total ?? 0) > 0) found.push(reference.reference)
    }

    return found
  }

  async allUploaded(ids: ReadonlyArray<string>): Promise<boolean> {
    const distinct = [...new Set(ids)]

    if (distinct.length === 0) return true

    const rows = await StorageModel.query()
      .whereIn('id', distinct)
      .where('status', UPLOAD_STATUS.UPLOADED)
      .withScopes((scopes) => scopes.notDeleted())

    // The count only matches when every distinct id matches a live file.
    return rows.length === distinct.length
  }

  async findAbandoned(before: Date): Promise<StorageRecord[]> {
    // The column order is that of the index `storages_status_created_at_index`.
    const rows = await StorageModel.query()
      .where('status', UPLOAD_STATUS.PENDING)
      .where('createdAt', '<', DateTime.fromJSDate(before).toSQL() ?? '')
      .orderBy('createdAt', 'asc')

    return rows.map((row) => this.toRecord(row))
  }

  async save(storage: Storage): Promise<StorageRecord> {
    const row = await StorageModel.updateOrCreate(
      { id: storage.id },
      this.toRow(storage),
    )

    await row.refresh()

    return this.toRecord(row)
  }

  async transferOwnership(from: string, to: string): Promise<void> {
    await StorageModel.query({ client: this.transaction.client() })
      .where('ownerId', from)
      .update({ ownerId: to })
  }

  async delete(storage: Storage): Promise<void> {
    await StorageModel.query().where('id', storage.id).delete()
  }

  private toRecord(row: StorageModel): StorageRecord {
    return {
      storage: this.toEntity(row),
      createdAt: LucidMapping.date(row.createdAt),
      updatedAt: LucidMapping.date(row.updatedAt),
    }
  }

  private toEntity(row: StorageModel): Storage {
    return Storage.restore({
      id: row.id,
      filename: row.filename,
      originalName: row.originalName,
      mimetype: row.mimetype,
      size: row.size,
      path: row.path,
      ownerId: row.ownerId,
      status: row.status,
      partSize: row.partSize,
      uploadId: row.uploadId,
      deletedAt: LucidMapping.date(row.deletedAt),
    })
  }

  /** The columns the entity decides; the time stamps belong to the model. */
  private toRow(storage: Storage) {
    const snapshot = storage.snapshot()

    return {
      filename: snapshot.filename,
      originalName: snapshot.originalName,
      mimetype: snapshot.mimetype,
      size: snapshot.size,
      path: snapshot.path,
      ownerId: snapshot.ownerId,
      status: snapshot.status,
      partSize: snapshot.partSize,
      uploadId: snapshot.uploadId,
      deletedAt: LucidMapping.dateTime(snapshot.deletedAt),
    }
  }
}
