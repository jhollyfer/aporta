import { randomUUID } from 'node:crypto'

import app from '@adonisjs/core/services/app'
import {
  SORT_DIRECTION,
  UPLOAD_STATUS,
  type StorageFileShowResponse,
} from '@aporta/shared'
import { DateTime } from 'luxon'

import { UserFactory } from '#database/factories/user.factory'
import type Listing from '#domain/listing/listing.entity'
import ListingLucidRepository from '#repositories/listing/listing.lucid.repository'
import ListingMemoryRepository, {
  type ListingStamps,
} from '#repositories/listing/listing.memory.repository'
import type ListingRepository from '#repositories/listing/listing.repository'
import LucidMapping from '#repositories/shared/lucid-mapping'
import { storageRecord } from '#tests/database-fixtures'
import { storageFile } from '#tests/repository-fixtures'
import { neighborhood, seedListing } from '#tests/storefront-fixtures'

/**
 * The `ListingRepository` contract test (`_standards/domain.md` §5.4): the same cases on Lucid,
 * against Postgres, and in memory. Each implementation says how to create what a listing points
 * to (a neighborhood, an account, a file) and how to seed a listing the way the storefront finds
 * it: in Lucid, rows; in memory, `put`.
 */
export type Subject = {
  repository: ListingRepository
  neighborhood(slug: string, name: string): Promise<string>
  /** An account that exists for the implementation: `owner_id` is a foreign key to `users`. */
  account(): Promise<string>
  /** An account the staff already verified: its seal is what the ads that point to it show. */
  verifiedAccount(): Promise<string>
  /** A live `UPLOADED` file the account sent, which a photo can show. */
  file(ownerId: string): Promise<StorageFileShowResponse>
  /** A file a photo may point to but a visitor must not be given: it never finished uploading. */
  unfinishedFile(ownerId: string): Promise<StorageFileShowResponse>
  seed(listing: Listing, stamps?: ListingStamps): Promise<void>
}

export const IMPLEMENTATIONS = {
  lucid: async () => ({
    repository: await app.container.make(ListingLucidRepository),
    neighborhood: async (slug: string, name: string) => {
      const row = await neighborhood({ slug, name })
      return row.id
    },
    account: async () => (await UserFactory.create()).id,
    verifiedAccount: async () =>
      (await UserFactory.merge({ verifiedAt: DateTime.now() }).create()).id,
    file: async (ownerId: string) => {
      const row = await storageRecord({ ownerId })
      return fileOf(LucidMapping.file(row))
    },
    unfinishedFile: async (ownerId: string) => {
      const row = await storageRecord({
        ownerId,
        status: UPLOAD_STATUS.PENDING,
      })
      return fileOf(LucidMapping.file(row))
    },
    seed: async (listing: Listing, stamps?: ListingStamps) => {
      await seedListing(listing, stamps)
    },
  }),
  memory: async () => {
    const repository = await app.container.make(ListingMemoryRepository)

    return {
      repository,
      neighborhood: (slug: string, name: string) => {
        const id = randomUUID()
        repository.putNeighborhood(id, { slug, name })
        return Promise.resolve(id)
      },
      account: () => Promise.resolve(accountIn(repository, null)),
      verifiedAccount: () =>
        Promise.resolve(
          accountIn(repository, new Date('2026-10-01T12:00:00Z')),
        ),
      file: () => {
        const file = storageFile()
        repository.putFile(file)
        return Promise.resolve(file)
      },
      // The memory repository serves only the files that were put.
      unfinishedFile: () => Promise.resolve(storageFile()),
      seed: (listing: Listing, stamps?: ListingStamps) => {
        repository.put(listing, stamps)
        return Promise.resolve()
      },
    }
  },
} satisfies Record<string, () => Promise<Subject>>

/** An account the memory repository knows, as Postgres knows the `users` row an ad points to. */
function accountIn(
  repository: ListingMemoryRepository,
  verifiedAt: Date | null,
): string {
  const id = randomUUID()
  repository.putAccount({
    id,
    name: 'Dona Maria',
    email: `${id}@mail.com`,
    verifiedAt,
  })

  return id
}

/** The mapped file, or the failure on the spot: a row the spec just created is never missing. */
function fileOf(file: StorageFileShowResponse | null): StorageFileShowResponse {
  if (!file) throw new Error('storage row missing')

  return file
}

export const PAGE = {
  page: 1,
  perPage: 20,
  sort: 'createdAt',
  direction: SORT_DIRECTION.DESC,
} as const
