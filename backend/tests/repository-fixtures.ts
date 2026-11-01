import { randomUUID } from 'node:crypto'

import {
  STORAGE_MIMETYPE,
  UPLOAD_STATUS,
  type Either,
  type StorageFileShowResponse,
} from '@aporta/shared'

import Storage, {
  type StorageCreateInput,
} from '#domain/storage/storage.entity'

/**
 * What the specs of every entity, the repository contract tests and
 * the use-case unit tests build the same way, whatever the resource: the
 * archiving instant, the `storages` file and writing already to the trash.
 */

/** The instant at which the specs archive. */
export const ARCHIVED_AT = new Date('2026-01-15T12:00:00.000Z')

/** A `storages` file as the repository returns it, still without `url`. */
export function storageFile(
  id: string = randomUUID(),
): StorageFileShowResponse {
  return {
    id,
    filename: `${id}.png`,
    originalName: 'foto.png',
    mimetype: 'image/png',
    size: 1024,
    path: `${id}.png`,
    status: UPLOAD_STATUS.UPLOADED,
    partSize: null,
    uploadId: null,
    createdAt: ARCHIVED_AT.toISOString(),
    updatedAt: null,
    deletedAt: null,
  }
}

/** Writes already to the trash: archiving is an entity transition, not a loose column. */
export async function archived<Entity extends { archive(at: Date): unknown }>(
  repository: { save(entity: Entity): Promise<unknown> },
  entity: Entity,
): Promise<void> {
  entity.archive(ARCHIVED_AT)
  await repository.save(entity)
}

/** A freshly opened `PENDING` file, as the entity creates it. */
/** The account the draft files belong to in the unit specs, which have no users table. */
export const STORAGE_OWNER_ID = '00000000-0000-4000-8000-0000000000a1'

export function storageDraft(input: Partial<StorageCreateInput> = {}): Storage {
  const id = randomUUID()
  return Storage.create({
    id,
    key: `${id}.png`,
    originalName: 'foto.png',
    mimetype: STORAGE_MIMETYPE.PNG,
    size: 1024,
    partSize: 5 * 1024 * 1024,
    uploadId: null,
    ownerId: STORAGE_OWNER_ID,
    ...input,
  })
}

/**
 * The write the test expects to succeed: the record, or the failure on the spot.
 * `save` returns `Either` because the `UNIQUE` index may block the write.
 */
export function recorded<Fact, Stored>(result: Either<Fact, Stored>): Stored {
  if (result.isLeft())
    throw new Error(`save refused: ${JSON.stringify(result.value)}`)

  return result.value
}
