import { randomUUID } from 'node:crypto'

import {
  LISTING_PHOTOS_MAX,
  LISTING_STATUS,
  PHOTO_ENVIRONMENT,
  STORAGE_MIMETYPE,
} from '@aporta/shared'
import { test } from '@japa/runner'

import OwnerListingPhotoCreateUseCase from './create.use-case.ts'

import ListingMemoryRepository from '#repositories/listing/listing.memory.repository'
import NeighborhoodMemoryRepository from '#repositories/neighborhood/neighborhood.memory.repository'
import StorageMemoryRepository from '#repositories/storage/storage.memory.repository'
import IdGeneratorFake from '#services/id-generator/id-generator.fake'
import StorageFake from '#services/storage/storage.fake'
import {
  FailingListingRepository,
  listingIn,
  centroIn,
} from '#tests/listing-fixtures'
import { storageDraft, storageFile } from '#tests/repository-fixtures'
import { actorDraft } from '#tests/user-fixtures'

/** The two memory repositories, agreeing on one neighborhood (`centro`). */
function fresh() {
  const listings = new ListingMemoryRepository()
  const neighborhoods = new NeighborhoodMemoryRepository()
  const centro = centroIn(listings, neighborhoods)

  return { listings, neighborhoods, centro }
}

/** An ad of `actor`, the file store, and a way to upload a finished file as `ownerId`. */
function subject() {
  const world = fresh()
  const actor = actorDraft()
  const entity = listingIn(LISTING_STATUS.PENDING, {
    slug: 'minha',
    neighborhoodId: world.centro.id,
    ownerId: actor.id,
  })
  world.listings.put(entity)
  const storages = new StorageMemoryRepository()
  const useCase = new OwnerListingPhotoCreateUseCase(
    world.listings,
    storages,
    new StorageFake(),
    new IdGeneratorFake(),
  )

  /** A finished upload by `ownerId`, whose file the listing read can sign. */
  async function uploaded(
    ownerId: string,
    mimetype:
      | typeof STORAGE_MIMETYPE.PNG
      | typeof STORAGE_MIMETYPE.PDF = STORAGE_MIMETYPE.PNG,
  ) {
    const file = storageDraft({ ownerId, mimetype, size: 5 })
    file.confirm(5)
    await storages.save(file)
    world.listings.putFile(storageFile(file.id))

    return file
  }

  return { ...world, actor, entity, storages, useCase, uploaded }
}

test.group('owner > listing-photos > create (unit)', () => {
  test("when the files are the account's finished images, they go to the end of the gallery, in order, with the signed url", async ({
    assert,
  }) => {
    const { actor, entity, uploaded, useCase } = subject()
    const facade = await uploaded(actor.id)
    const kitchen = await uploaded(actor.id)

    const result = await useCase.execute({
      id: entity.id,
      actor,
      photos: [
        { storageId: facade.id, environment: PHOTO_ENVIRONMENT.FACADE },
        { storageId: kitchen.id, environment: PHOTO_ENVIRONMENT.KITCHEN },
      ],
    })

    if (result.isLeft()) return assert.fail(result.value.message)

    assert.deepEqual(
      result.value.photos.map((photo) => [
        photo.environment,
        photo.storageId,
        photo.url,
      ]),
      [
        [PHOTO_ENVIRONMENT.FACADE, facade.id, `fake://${facade.id}.png`],
        [PHOTO_ENVIRONMENT.KITCHEN, kitchen.id, `fake://${kitchen.id}.png`],
      ],
    )
  })

  test("when a file is another account's, still PENDING, not an image or unknown, it answers the same 422 and attaches nothing", async ({
    assert,
  }) => {
    const { actor, entity, listings, storages, uploaded, useCase } = subject()
    const mine = await uploaded(actor.id)
    const foreign = await uploaded(actorDraft().id)
    const manual = await uploaded(actor.id, STORAGE_MIMETYPE.PDF)
    const pending = storageDraft({ ownerId: actor.id })
    await storages.save(pending)

    for (const storageId of [foreign.id, manual.id, pending.id, randomUUID()]) {
      const result = await useCase.execute({
        id: entity.id,
        actor,
        // The first file is fine: one bad file refuses the whole call, nothing is half attached.
        photos: [
          { storageId: mine.id, environment: PHOTO_ENVIRONMENT.FACADE },
          { storageId, environment: PHOTO_ENVIRONMENT.KITCHEN },
        ],
      })

      assert.containsSubset(result.value, {
        status: 422,
        code: 'STORAGE_NOT_FOUND',
        errors: { photos: 'Arquivo não encontrado' },
      })
    }

    const stored = await listings.findById(entity.id)
    assert.deepEqual(stored?.snapshot().photos, [])
  })

  test('when the ad would pass the ceiling, it answers 422 LISTING_PHOTOS_LIMIT', async ({
    assert,
  }) => {
    const { actor, entity, uploaded, useCase } = subject()
    const photos = []
    for (let index = 0; index <= LISTING_PHOTOS_MAX; index += 1)
      photos.push({
        storageId: (await uploaded(actor.id)).id,
        environment: PHOTO_ENVIRONMENT.LIVING,
      })

    const result = await useCase.execute({ id: entity.id, actor, photos })

    assert.containsSubset(result.value, {
      status: 422,
      code: 'LISTING_PHOTOS_LIMIT',
    })
  })

  test('when the same file is sent twice, it answers 409 LISTING_PHOTO_DUPLICATED', async ({
    assert,
  }) => {
    const { actor, entity, uploaded, useCase } = subject()
    const file = await uploaded(actor.id)

    const result = await useCase.execute({
      id: entity.id,
      actor,
      photos: [
        { storageId: file.id, environment: PHOTO_ENVIRONMENT.FACADE },
        { storageId: file.id, environment: PHOTO_ENVIRONMENT.KITCHEN },
      ],
    })

    assert.containsSubset(result.value, {
      status: 409,
      code: 'LISTING_PHOTO_DUPLICATED',
    })
  })

  test('when the ad does not exist, it answers 404 LISTING_NOT_FOUND', async ({
    assert,
  }) => {
    const { actor, uploaded, useCase } = subject()
    const file = await uploaded(actor.id)

    const result = await useCase.execute({
      id: randomUUID(),
      actor,
      photos: [{ storageId: file.id, environment: PHOTO_ENVIRONMENT.FACADE }],
    })

    assert.containsSubset(result.value, {
      status: 404,
      code: 'LISTING_NOT_FOUND',
    })
  })

  test('when the repository fails, it answers 500 with the module code', async ({
    assert,
  }) => {
    const useCase = new OwnerListingPhotoCreateUseCase(
      new FailingListingRepository(),
      new StorageMemoryRepository(),
      new StorageFake(),
      new IdGeneratorFake(),
    )

    const result = await useCase.execute({
      id: randomUUID(),
      actor: actorDraft(),
      photos: [
        { storageId: randomUUID(), environment: PHOTO_ENVIRONMENT.FACADE },
      ],
    })

    assert.containsSubset(result.value, {
      status: 500,
      code: 'OWNER_LISTING_PHOTO_CREATE_ERROR',
    })
  })
})
