import { randomUUID } from 'node:crypto'

import { LISTING_STATUS, PHOTO_ENVIRONMENT } from '@aporta/shared'
import { test } from '@japa/runner'

import StorefrontListingShowUseCase from './show.use-case.ts'

import ListingMemoryRepository from '#repositories/listing/listing.memory.repository'
import StorageFake from '#services/storage/storage.fake'
import { listingIn } from '#tests/listing-fixtures'
import { ARCHIVED_AT, storageFile } from '#tests/repository-fixtures'

test.group('storefront > listings > show (unit)', () => {
  test('when published, it returns the ad presented with its neighborhood and the owner contact', async ({
    assert,
  }) => {
    const neighborhoodId = randomUUID()
    const listings = new ListingMemoryRepository()
    listings.putNeighborhood(neighborhoodId, { slug: 'centro', name: 'Centro' })
    const entity = listingIn(LISTING_STATUS.PUBLISHED, {
      slug: 'kitnet-centro-porto',
      neighborhoodId,
      owner: {
        name: 'Seu Raimundo',
        whatsapp: '5597999990002',
        verifiedAt: new Date('2026-10-30T12:00:00.000Z'),
      },
    })
    listings.put(entity)
    const useCase = new StorefrontListingShowUseCase(
      listings,
      new StorageFake(),
    )

    const result = await useCase.execute({ slug: 'kitnet-centro-porto' })

    assert.containsSubset(result.value, {
      id: entity.id,
      slug: 'kitnet-centro-porto',
      neighborhood: { slug: 'centro', name: 'Centro' },
      price: { monthly: 900, daily: null },
      owner: {
        name: 'Seu Raimundo',
        verified: true,
        whatsapp: '5597999990002',
      },
    })
  })

  test('when draft, pending, archived, trashed or unknown, it answers the same 404', async ({
    assert,
  }) => {
    const neighborhoodId = randomUUID()
    const listings = new ListingMemoryRepository()
    listings.putNeighborhood(neighborhoodId, { slug: 'centro', name: 'Centro' })
    const useCase = new StorefrontListingShowUseCase(
      listings,
      new StorageFake(),
    )

    for (const [slug, status, deletedAt] of [
      ['rascunho', LISTING_STATUS.DRAFT, null],
      ['em-analise', LISTING_STATUS.PENDING, null],
      ['arquivado', LISTING_STATUS.ARCHIVED, null],
      ['na-lixeira', LISTING_STATUS.PUBLISHED, ARCHIVED_AT],
    ] as const) {
      listings.put(listingIn(status, { slug, neighborhoodId }, deletedAt))

      const result = await useCase.execute({ slug })

      assert.containsSubset(result.value, {
        status: 404,
        code: 'LISTING_NOT_FOUND',
      })
    }

    const unknown = await useCase.execute({ slug: 'nenhum' })

    assert.containsSubset(unknown.value, {
      status: 404,
      code: 'LISTING_NOT_FOUND',
    })
  })

  test('when a photo has a live file, its url is the signed address; a slot without file or with a missing one is null', async ({
    assert,
  }) => {
    const neighborhoodId = randomUUID()
    const listings = new ListingMemoryRepository()
    listings.putNeighborhood(neighborhoodId, { slug: 'centro', name: 'Centro' })
    const file = storageFile()
    listings.putFile(file)
    const entity = listingIn(LISTING_STATUS.PUBLISHED, {
      slug: 'com-fotos',
      neighborhoodId,
      photos: [
        {
          id: randomUUID(),
          environment: PHOTO_ENVIRONMENT.FACADE,
          storageId: file.id,
        },
        {
          id: randomUUID(),
          environment: PHOTO_ENVIRONMENT.KITCHEN,
          storageId: null,
        },
        {
          id: randomUUID(),
          environment: PHOTO_ENVIRONMENT.BEDROOM,
          // A file that was deleted or never finished: the slot keeps its place and loses the picture.
          storageId: randomUUID(),
        },
      ],
    })
    listings.put(entity)
    const useCase = new StorefrontListingShowUseCase(
      listings,
      new StorageFake(),
    )

    const result = await useCase.execute({ slug: 'com-fotos' })

    if (result.isLeft()) throw result.value

    assert.deepEqual(
      result.value.photos.map((photo) => photo.url),
      [`fake://${file.path}`, null, null],
    )
    // The public shape never carries the file key.
    assert.notProperty(result.value.photos[0], 'storageId')
  })
})
