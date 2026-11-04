import { randomUUID } from 'node:crypto'

import {
  LISTING_STATUS,
  PHOTO_ENVIRONMENT,
  REPORT_REASON,
  TRASHED_MODE,
} from '@aporta/shared'
import { test } from '@japa/runner'

import AdministratorListingDeleteUseCase from './delete.use-case.ts'

import Report from '#domain/report/report.entity'
import ListingMemoryRepository from '#repositories/listing/listing.memory.repository'
import NeighborhoodMemoryRepository from '#repositories/neighborhood/neighborhood.memory.repository'
import ReportMemoryRepository from '#repositories/report/report.memory.repository'
import StorageMemoryRepository from '#repositories/storage/storage.memory.repository'
import { STORAGE_REFERENCE } from '#repositories/storage/storage.repository'
import StorageFake from '#services/storage/storage.fake'
import {
  FailingListingRepository,
  centroIn,
  listingIn,
} from '#tests/listing-fixtures'
import { ARCHIVED_AT, storageDraft } from '#tests/repository-fixtures'

/** Only the archived ad is in the trash. */
const ARCHIVED_AT_OF = {
  DRAFT: null,
  PENDING: null,
  PUBLISHED: null,
  ARCHIVED: ARCHIVED_AT,
} as const satisfies Record<keyof typeof LISTING_STATUS, Date | null>

/** An archived ad with two photos, each over a finished file that has its object in the fake bucket. */
async function subject(status: keyof typeof LISTING_STATUS = 'ARCHIVED') {
  const listings = new ListingMemoryRepository()
  const reports = new ReportMemoryRepository()
  const centro = centroIn(listings, new NeighborhoodMemoryRepository())
  const storages = new StorageMemoryRepository()
  const bucket = new StorageFake()

  async function file() {
    const draft = storageDraft({ size: 5 })
    draft.confirm(5)
    await storages.save(draft)
    bucket.object(draft.snapshot().path, 5)

    return draft
  }

  const first = await file()
  const second = await file()
  const entity = listingIn(
    LISTING_STATUS[status],
    {
      slug: 'saindo-de-vez',
      neighborhoodId: centro.id,
      photos: [
        {
          id: randomUUID(),
          environment: PHOTO_ENVIRONMENT.FACADE,
          storageId: first.id,
        },
        {
          id: randomUUID(),
          environment: PHOTO_ENVIRONMENT.KITCHEN,
          storageId: second.id,
        },
      ],
    },
    ARCHIVED_AT_OF[status],
  )
  listings.put(entity)
  reports.putListing({ id: entity.id, slug: 'saindo-de-vez', title: 'Casa' })

  return {
    listings,
    reports,
    storages,
    bucket,
    entity,
    first,
    second,
    useCase: new AdministratorListingDeleteUseCase(
      listings,
      reports,
      storages,
      bucket,
    ),
  }
}

test.group('administrator > listings > delete (unit)', () => {
  test('when the ad is archived, it is erased and the orphan files leave the bucket', async ({
    assert,
  }) => {
    const { entity, first, second, listings, storages, bucket, useCase } =
      await subject()

    const result = await useCase.execute({ id: entity.id })

    assert.isTrue(result.isRight())
    assert.isNull(await listings.findAnyById(entity.id))
    assert.isTrue(bucket.discarded(first.snapshot().path))
    assert.isTrue(bucket.discarded(second.snapshot().path))
    assert.isNull(await storages.findById(first.id, TRASHED_MODE.WITH))
  })

  test('when another record still references a file, the ad goes but the binary stays', async ({
    assert,
  }) => {
    const { entity, first, second, storages, bucket, useCase } = await subject()
    storages.reference(first.id, STORAGE_REFERENCE.LISTING_PHOTO)

    const result = await useCase.execute({ id: entity.id })

    assert.isTrue(result.isRight())
    assert.isFalse(bucket.discarded(first.snapshot().path))
    assert.isNotNull(await storages.findById(first.id, TRASHED_MODE.WITH))
    assert.isTrue(bucket.discarded(second.snapshot().path))
  })

  test('when the bucket fails, the ad stays erased and the answer is still a success', async ({
    assert,
  }) => {
    const { entity, listings, bucket, useCase } = await subject()
    bucket.failWith(new Error('bucket down'))

    const result = await useCase.execute({ id: entity.id })

    assert.isTrue(result.isRight())
    assert.isNull(await listings.findAnyById(entity.id))
  })

  test('when the ad is not archived, it answers 409 LISTING_NOT_ARCHIVED and keeps it', async ({
    assert,
  }) => {
    for (const status of ['DRAFT', 'PENDING', 'PUBLISHED'] as const) {
      const { entity, listings, bucket, first, useCase } = await subject(status)

      const result = await useCase.execute({ id: entity.id })

      assert.containsSubset(result.value, {
        status: 409,
        code: 'LISTING_NOT_ARCHIVED',
      })
      assert.isNotNull(await listings.findAnyById(entity.id))
      assert.isFalse(bucket.discarded(first.snapshot().path))
    }
  })

  test('when the ad has a report, it answers 409 LISTING_HAS_REPORTS and keeps everything', async ({
    assert,
  }) => {
    const { entity, listings, reports, bucket, first, useCase } =
      await subject()
    reports.put(
      Report.create({
        id: randomUUID(),
        listingId: entity.id,
        reason: REPORT_REASON.SCAM,
        details: null,
        reporterHash: null,
      }),
    )

    const result = await useCase.execute({ id: entity.id })

    assert.containsSubset(result.value, {
      status: 409,
      code: 'LISTING_HAS_REPORTS',
    })
    assert.isNotNull(await listings.findAnyById(entity.id))
    assert.isFalse(bucket.discarded(first.snapshot().path))
  })

  test('when the ad does not exist, it answers 404 LISTING_NOT_FOUND', async ({
    assert,
  }) => {
    const { useCase } = await subject()

    const result = await useCase.execute({ id: randomUUID() })

    assert.containsSubset(result.value, {
      status: 404,
      code: 'LISTING_NOT_FOUND',
    })
  })

  test('when the repository fails, it answers the module 500 code', async ({
    assert,
  }) => {
    const useCase = new AdministratorListingDeleteUseCase(
      new FailingListingRepository(),
      new ReportMemoryRepository(),
      new StorageMemoryRepository(),
      new StorageFake(),
    )

    const result = await useCase.execute({ id: randomUUID() })

    assert.containsSubset(result.value, {
      status: 500,
      code: 'ADMINISTRATOR_LISTING_DELETE_ERROR',
    })
  })
})
