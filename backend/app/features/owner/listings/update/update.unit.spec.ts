import { randomUUID } from 'node:crypto'

import { LISTING_STATUS, USER_ROLE } from '@aporta/shared'
import { test } from '@japa/runner'

import OwnerListingUpdateUseCase from './update.use-case.ts'

import ListingMemoryRepository from '#repositories/listing/listing.memory.repository'
import NeighborhoodMemoryRepository from '#repositories/neighborhood/neighborhood.memory.repository'
import UserMemoryRepository from '#repositories/user/user.memory.repository'
import StorageFake from '#services/storage/storage.fake'
import {
  FailingListingRepository,
  listingIn,
  centroIn,
} from '#tests/listing-fixtures'
import { neighborhoodDraft } from '#tests/neighborhood-fixtures'
import { userDraft } from '#tests/user-fixtures'

/** The two memory repositories, agreeing on one neighborhood (`centro`). */
function fresh() {
  const listings = new ListingMemoryRepository()
  const neighborhoods = new NeighborhoodMemoryRepository()
  const centro = centroIn(listings, neighborhoods)

  return { listings, neighborhoods, centro }
}

function subject() {
  const world = fresh()
  const entity = listingIn(LISTING_STATUS.PUBLISHED, {
    slug: 'minha',
    neighborhoodId: world.centro.id,
    owner: {
      name: 'Seu Raimundo',
      whatsapp: '5597999990002',
      verifiedAt: new Date('2026-10-30T12:00:00.000Z'),
    },
  })
  world.listings.put(entity)
  const users = new UserMemoryRepository()
  const useCase = new OwnerListingUpdateUseCase(
    world.listings,
    world.neighborhoods,
    users,
    new StorageFake(),
  )

  return { ...world, entity, users, useCase }
}

test.group('owner > listings > update (unit)', () => {
  test('when fields are sent, only those change, and the status and the slug stay', async ({
    assert,
  }) => {
    const { entity, useCase } = subject()

    const result = await useCase.execute({
      id: entity.id,
      title: 'Kitnet reformada no centro',
      monthly: 750,
      water: false,
    })

    if (result.isLeft()) return assert.fail(result.value.message)

    assert.containsSubset(result.value, {
      title: 'Kitnet reformada no centro',
      price: { monthly: 750, daily: null },
      // `water` was sent; the other two costs keep what the ad had.
      costs: { water: false, electricity: true, internet: true },
      status: LISTING_STATUS.PUBLISHED,
      slug: 'minha',
      address: entity.snapshot().address,
    })
  })

  test('when the rules are sent, the text becomes a list again', async ({
    assert,
  }) => {
    const { entity, useCase } = subject()

    const result = await useCase.execute({
      id: entity.id,
      rules: 'Sem festa\nSem animais',
    })

    if (result.isLeft()) return assert.fail(result.value.message)

    assert.deepEqual(result.value.rules, ['Sem festa', 'Sem animais'])
  })

  test('when the contact changes, the verified badge goes away; when only the title changes, it stays', async ({
    assert,
  }) => {
    const { entity, useCase } = subject()

    const kept = await useCase.execute({
      id: entity.id,
      title: 'Kitnet perto do porto',
    })
    const changed = await useCase.execute({
      id: entity.id,
      whatsapp: '5597999990099',
    })

    if (kept.isLeft() || changed.isLeft()) return assert.fail('update failed')

    assert.isTrue(kept.value.owner.verified)
    assert.containsSubset(changed.value.owner, {
      verified: false,
      whatsapp: '5597999990099',
      // The name was not sent: it is kept.
      name: 'Seu Raimundo',
    })
  })

  test('when the neighborhood changes, the pin moves to the center of the new one', async ({
    assert,
  }) => {
    const { entity, listings, neighborhoods, useCase } = subject()
    const colonia = neighborhoodDraft({
      slug: 'colonia',
      name: 'Colônia',
      lat: -4.4,
      lng: -70.1,
    })
    neighborhoods.put(colonia)
    listings.putNeighborhood(colonia.id, { slug: 'colonia', name: 'Colônia' })

    const result = await useCase.execute({
      id: entity.id,
      neighborhood: 'colonia',
    })

    if (result.isLeft()) return assert.fail(result.value.message)

    assert.containsSubset(result.value, {
      neighborhood: { slug: 'colonia', name: 'Colônia' },
      lat: -4.4,
      lng: -70.1,
    })
  })

  test('when the neighborhood does not exist, it answers 422 on the field and changes nothing', async ({
    assert,
  }) => {
    const { entity, listings, useCase } = subject()

    const result = await useCase.execute({
      id: entity.id,
      title: 'Outro título qualquer',
      neighborhood: 'nenhum',
    })

    assert.containsSubset(result.value, {
      status: 422,
      code: 'NEIGHBORHOOD_NOT_FOUND',
    })
    const stored = await listings.findById(entity.id)
    assert.equal(stored?.snapshot().title, entity.snapshot().title)
  })

  test('when the ad does not exist, it answers 404 LISTING_NOT_FOUND', async ({
    assert,
  }) => {
    const { useCase } = subject()

    const result = await useCase.execute({
      id: randomUUID(),
      title: 'Qualquer',
    })

    assert.containsSubset(result.value, {
      status: 404,
      code: 'LISTING_NOT_FOUND',
    })
  })

  test('when the repository fails, it answers 500 with the module code', async ({
    assert,
  }) => {
    const { neighborhoods } = subject()
    const useCase = new OwnerListingUpdateUseCase(
      new FailingListingRepository(),
      neighborhoods,
      new UserMemoryRepository(),
      new StorageFake(),
    )

    const result = await useCase.execute({ id: randomUUID() })

    assert.containsSubset(result.value, {
      status: 500,
      code: 'OWNER_LISTING_UPDATE_ERROR',
    })
  })

  test('when the staff sent the ad back, editing it hands it to the queue again and clears the reason', async ({
    assert,
  }) => {
    const world = fresh()
    const entity = listingIn(LISTING_STATUS.PENDING, {
      slug: 'devolvida',
      neighborhoodId: world.centro.id,
    })
    entity.refuse('Faltam fotos.', 'staff-1', new Date('2026-11-01T12:00:00Z'))
    world.listings.put(entity)
    const useCase = new OwnerListingUpdateUseCase(
      world.listings,
      world.neighborhoods,
      new UserMemoryRepository(),
      new StorageFake(),
    )

    const result = await useCase.execute({
      id: entity.id,
      title: 'Kitnet com fotos novas',
    })

    if (result.isLeft()) return assert.fail('update failed')

    assert.equal(result.value.status, LISTING_STATUS.PENDING)
    assert.isNull(result.value.review)
  })

  test('when the ad is published or pending, editing never moves the status', async ({
    assert,
  }) => {
    for (const status of [LISTING_STATUS.PUBLISHED, LISTING_STATUS.PENDING]) {
      const world = fresh()
      const entity = listingIn(status, {
        slug: 'fica',
        neighborhoodId: world.centro.id,
      })
      world.listings.put(entity)
      const useCase = new OwnerListingUpdateUseCase(
        world.listings,
        world.neighborhoods,
        new UserMemoryRepository(),
        new StorageFake(),
      )

      const result = await useCase.execute({
        id: entity.id,
        title: 'Titulo novo do anuncio',
      })

      if (result.isLeft()) return assert.fail('update failed')

      assert.equal(result.value.status, status)
    }
  })

  test('when the contact changes on an ad of a verified account, the account loses the seal; when only the title changes, it keeps it', async ({
    assert,
  }) => {
    const world = fresh()
    const users = new UserMemoryRepository()
    const account = userDraft({ role: USER_ROLE.OWNER })
    account.verify(new Date('2026-10-01T12:00:00Z'))
    await users.save(account)
    const entity = listingIn(LISTING_STATUS.PUBLISHED, {
      slug: 'conta-verificada',
      neighborhoodId: world.centro.id,
      ownerId: account.id,
    })
    world.listings.put(entity)
    const useCase = new OwnerListingUpdateUseCase(
      world.listings,
      world.neighborhoods,
      users,
      new StorageFake(),
    )

    await useCase.execute({ id: entity.id, title: 'Titulo novo do anuncio' })
    const kept = (await users.findById(account.id))?.snapshot().verifiedAt

    await useCase.execute({ id: entity.id, whatsapp: '5597999990099' })
    const lost = (await users.findById(account.id))?.snapshot().verifiedAt

    assert.instanceOf(kept, Date)
    assert.isNull(lost)
  })
})
