import { LISTING_STATUS } from '@aporta/shared'
import { test } from '@japa/runner'

import OwnerListingCreateUseCase from './create.use-case.ts'

import ListingMemoryRepository from '#repositories/listing/listing.memory.repository'
import NeighborhoodMemoryRepository from '#repositories/neighborhood/neighborhood.memory.repository'
import ClockFake from '#services/clock/clock.fake'
import IdGeneratorFake from '#services/id-generator/id-generator.fake'
import StorageFake from '#services/storage/storage.fake'
import {
  FailingListingRepository,
  OWNER_LISTING_PAYLOAD,
  listingDraft,
  centroIn,
} from '#tests/listing-fixtures'
import { actorDraft } from '#tests/user-fixtures'

/** The two memory repositories, agreeing on one neighborhood (`centro`). */
function fresh() {
  const listings = new ListingMemoryRepository()
  const neighborhoods = new NeighborhoodMemoryRepository()
  const centro = centroIn(listings, neighborhoods)

  return { listings, neighborhoods, centro }
}

function subject() {
  const world = fresh()
  const useCase = new OwnerListingCreateUseCase(
    world.listings,
    world.neighborhoods,
    new StorageFake(),
    new IdGeneratorFake(),
    new ClockFake(),
  )

  return { ...world, useCase }
}

test.group('owner > listings > create (unit)', () => {
  test('when the payload is valid, the ad is born PENDING and belongs to the session account', async ({
    assert,
  }) => {
    const { listings, useCase } = subject()
    const actor = actorDraft()

    const result = await useCase.execute({ ...OWNER_LISTING_PAYLOAD, actor })

    if (result.isLeft()) return assert.fail(result.value.message)

    assert.equal(result.value.status, LISTING_STATUS.PENDING)
    const stored = await listings.findById(result.value.id)
    assert.equal(stored?.snapshot().ownerId, actor.id)
    assert.isTrue(stored?.isOwnedBy(actor.id))
  })

  test('when the payload is valid, the ad carries the contact of the form, the center of the neighborhood and the rules as a list', async ({
    assert,
  }) => {
    const { useCase } = subject()

    const result = await useCase.execute({
      ...OWNER_LISTING_PAYLOAD,
      actor: actorDraft(),
    })

    if (result.isLeft()) return assert.fail(result.value.message)

    assert.containsSubset(result.value, {
      neighborhood: { slug: 'centro', name: 'Centro' },
      price: { monthly: 900, daily: null },
      costs: { water: true, electricity: true, internet: false },
      rules: ['Sem festa', 'Uma pessoa ou casal'],
      owner: {
        name: 'Seu Raimundo',
        whatsapp: '5597999990001',
        verified: false,
      },
      lat: -4.37,
      lng: -70.03,
      // The form has no date and no rooms yet: the ad is for rent from today, with one of each.
      availableFrom: '2026-01-15',
      bedrooms: 1,
      bathrooms: 1,
      photos: [],
    })
  })

  test('when rooms are sent, they are used instead of the default', async ({
    assert,
  }) => {
    const { useCase } = subject()

    const result = await useCase.execute({
      ...OWNER_LISTING_PAYLOAD,
      bedrooms: 3,
      bathrooms: 2,
      actor: actorDraft(),
    })

    if (result.isLeft()) return assert.fail(result.value.message)

    assert.containsSubset(result.value, { bedrooms: 3, bathrooms: 2 })
  })

  test('when the title is made of accents and spaces, the slug is its plain form plus a suffix, and it never collides across ads', async ({
    assert,
  }) => {
    const { useCase } = subject()
    const actor = actorDraft()

    const first = await useCase.execute({
      ...OWNER_LISTING_PAYLOAD,
      title: 'Kitnet na Colônia!',
      actor,
    })
    const second = await useCase.execute({
      ...OWNER_LISTING_PAYLOAD,
      title: 'Kitnet na Colônia!',
      actor,
    })

    if (first.isLeft() || second.isLeft()) return assert.fail('create failed')

    assert.match(first.value.slug, /^kitnet-na-colonia-[0-9a-f]{8}$/)
    assert.notEqual(first.value.slug, second.value.slug)
  })

  test('when the neighborhood does not exist, it answers 422 on the field and writes nothing', async ({
    assert,
  }) => {
    const { listings, useCase } = subject()

    const result = await useCase.execute({
      ...OWNER_LISTING_PAYLOAD,
      neighborhood: 'nenhum',
      actor: actorDraft(),
    })

    assert.containsSubset(result.value, {
      status: 422,
      code: 'NEIGHBORHOOD_NOT_FOUND',
      errors: { neighborhood: 'Bairro não encontrado' },
    })
    const mine = await listings.paginateOwned({
      ownerId: 'x',
      page: 1,
      perPage: 20,
      sort: 'createdAt',
      direction: 'desc',
    })
    assert.equal(mine.meta.total, 0)
  })

  test('when the first slug is taken, it retries with another suffix', async ({
    assert,
  }) => {
    const { centro, listings, useCase } = subject()
    // The fake generator hands out ...0001 for the id and ...0002 for the first suffix.
    listings.put(
      listingDraft({
        slug: 'kitnet-perto-do-porto-00000002',
        neighborhoodId: centro.id,
      }),
    )

    const result = await useCase.execute({
      ...OWNER_LISTING_PAYLOAD,
      actor: actorDraft(),
    })

    if (result.isLeft()) return assert.fail(result.value.message)

    assert.equal(result.value.slug, 'kitnet-perto-do-porto-00000003')
  })

  test('when every attempt finds the slug taken, it gives up with the module 500 code instead of looping', async ({
    assert,
  }) => {
    const { centro, listings, useCase } = subject()
    for (const suffix of ['00000002', '00000003', '00000004'])
      listings.put(
        listingDraft({
          slug: `kitnet-perto-do-porto-${suffix}`,
          neighborhoodId: centro.id,
        }),
      )

    const result = await useCase.execute({
      ...OWNER_LISTING_PAYLOAD,
      actor: actorDraft(),
    })

    assert.containsSubset(result.value, {
      status: 500,
      code: 'OWNER_LISTING_CREATE_ERROR',
    })
  })

  test('when the repository fails, it answers 500 with the module code', async ({
    assert,
  }) => {
    const { neighborhoods } = subject()
    const useCase = new OwnerListingCreateUseCase(
      new FailingListingRepository(),
      neighborhoods,
      new StorageFake(),
      new IdGeneratorFake(),
      new ClockFake(),
    )

    const result = await useCase.execute({
      ...OWNER_LISTING_PAYLOAD,
      actor: actorDraft(),
    })

    assert.containsSubset(result.value, {
      status: 500,
      code: 'OWNER_LISTING_CREATE_ERROR',
    })
  })
})
