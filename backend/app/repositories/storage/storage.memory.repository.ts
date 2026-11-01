import { UPLOAD_STATUS, type Paginated, type TrashedMode } from '@aporta/shared'

import MemoryRows, { type StoredRow } from '#core/memory-rows'
import Storage, { type StorageProps } from '#domain/storage/storage.entity'
import StorageRepository, {
  type StorageListCriteria,
  type StorageRecord,
  type StorageReference,
} from '#repositories/storage/storage.repository'

type Row = StoredRow<StorageProps>

/**
 * The in-memory file repository (`_standards/domain.md` §5.3): what the
 * use-case unit tests use, and the contract test runs the same cases against it
 * of Lucid. "Who uses this file" is what the spec declares with `reference`.
 */
export default class StorageMemoryRepository extends StorageRepository {
  readonly #rows = new Map<string, Row>()
  readonly #references = new Map<string, StorageReference[]>()
  readonly #uploaded = new Set<string>()

  /** A file that was uploaded and is live, without building the whole row. */
  uploaded(id: string): void {
    this.#uploaded.add(id)
  }

  /** A column of another resource pointing at the file, with its identifier. */
  reference(id: string, reference: StorageReference): void {
    this.#references.set(id, [...(this.#references.get(id) ?? []), reference])
  }

  findById(id: string, trashed?: TrashedMode): Promise<Storage | null> {
    const row = this.#rows.get(id)
    if (!row || !MemoryRows.inTrash(row, trashed)) return Promise.resolve(null)
    return Promise.resolve(this.record(row).storage)
  }

  findRecord(id: string): Promise<StorageRecord | null> {
    const row = this.#rows.get(id)
    if (!row || row.deletedAt !== null) return Promise.resolve(null)
    return Promise.resolve(this.record(row))
  }

  paginate(criteria: StorageListCriteria): Promise<Paginated<StorageRecord>> {
    const rows = [...this.#rows.values()].filter(
      (row) =>
        row.deletedAt === null &&
        (criteria.status === undefined || row.status === criteria.status) &&
        (criteria.mimetype === undefined ||
          row.mimetype === criteria.mimetype) &&
        MemoryRows.contains(
          [row.originalName, row.filename, row.mimetype],
          criteria.search,
        ),
    )

    return Promise.resolve(
      MemoryRows.page(rows, criteria, {
        sortValue: (row) => row[criteria.sort],
        toItem: (row) => this.record(row),
      }),
    )
  }

  references(id: string): Promise<StorageReference[]> {
    return Promise.resolve([...(this.#references.get(id) ?? [])])
  }

  allUploaded(ids: ReadonlyArray<string>): Promise<boolean> {
    return Promise.resolve(
      [...new Set(ids)].every((id) => {
        if (this.#uploaded.has(id)) return true

        const row = this.#rows.get(id)
        return row?.status === UPLOAD_STATUS.UPLOADED && row.deletedAt === null
      }),
    )
  }

  findAbandoned(before: Date): Promise<StorageRecord[]> {
    return Promise.resolve(
      [...this.#rows.values()]
        .filter(
          (row) =>
            row.status === UPLOAD_STATUS.PENDING && row.createdAt < before,
        )
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .map((row) => this.record(row)),
    )
  }

  save(storage: Storage): Promise<StorageRecord> {
    const snapshot = storage.snapshot()
    const row = MemoryRows.stamp(
      snapshot,
      this.#rows.get(snapshot.id),
      new Date(),
    )

    this.#rows.set(row.id, row)

    return Promise.resolve(this.record(row))
  }

  transferOwnership(from: string, to: string): Promise<void> {
    for (const [id, row] of this.#rows) {
      if (row.ownerId === from) this.#rows.set(id, { ...row, ownerId: to })
    }

    return Promise.resolve()
  }

  delete(storage: Storage): Promise<void> {
    this.#rows.delete(storage.id)

    return Promise.resolve()
  }

  private record(row: Row): StorageRecord {
    const { createdAt, updatedAt, ...props } = structuredClone(row)
    return { storage: Storage.restore(props), createdAt, updatedAt }
  }
}
