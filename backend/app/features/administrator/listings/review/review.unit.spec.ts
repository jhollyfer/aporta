import { randomUUID } from 'node:crypto'

import { LISTING_REVIEW_DECISION, LISTING_STATUS } from '@aporta/shared'
import { test } from '@japa/runner'

import AdministratorListingReviewUseCase from './review.use-case.ts'

import ListingMemoryRepository from '#repositories/listing/listing.memory.repository'
import NeighborhoodMemoryRepository from '#repositories/neighborhood/neighborhood.memory.repository'
import ClockFake from '#services/clock/clock.fake'
import StorageFake from '#services/storage/storage.fake'
import {
  FailingListingRepository,
  centroIn,
  listingIn,
} from '#tests/listing-fixtures'
import { actorDraft } from '#tests/user-fixtures'

function fresh(status: Parameters<typeof listingIn>[0]) {
  const listings = new ListingMemoryRepository()
  const centro = centroIn(listings, new NeighborhoodMemoryRepository())
  const entity = listingIn(status, {
    slug: 'na-fila',
    neighborhoodId: centro.id,
  })
  listings.put(entity)
  const useCase = new AdministratorListingReviewUseCase(
    listings,
    new StorageFake(),
    new ClockFake(),
  )

  return { listings, entity, useCase }
}

test.group('administrator > listings > review (unit)', () => {
  test('when approved, the ad goes on the air at the clock instant and the storefront finds it', async ({
    assert,
  }) => {
    const { listings, entity, useCase } = fresh(LISTING_STATUS.PENDING)
    const actor = actorDraft()

    const result = await useCase.execute({
      id: entity.id,
      decision: LISTING_REVIEW_DECISION.APPROVE,
      actor,
    })

    if (result.isLeft()) return assert.fail('review failed')

    assert.equal(result.value.status, LISTING_STATUS.PUBLISHED)
    assert.equal(result.value.publishedAt, '2026-01-15T12:00:00.000+00:00')
    assert.equal(result.value.review?.reviewedBy, actor.id)
    assert.isNull(result.value.review?.note)
    assert.isNotNull(await listings.findPublishedRecordBySlug('na-fila'))
  })

  test('when refused with a reason, the ad goes back to DRAFT with the reason and the storefront still does not find it', async ({
    assert,
  }) => {
    const { listings, entity, useCase } = fresh(LISTING_STATUS.PENDING)

    const result = await useCase.execute({
      id: entity.id,
      decision: LISTING_REVIEW_DECISION.REFUSE,
      note: 'Faltam as fotos do banheiro e da cozinha.',
      actor: actorDraft(),
    })

    if (result.isLeft()) return assert.fail('review failed')

    assert.equal(result.value.status, LISTING_STATUS.DRAFT)
    assert.equal(
      result.value.review?.note,
      'Faltam as fotos do banheiro e da cozinha.',
    )
    assert.isNull(result.value.publishedAt)
    assert.isNull(await listings.findPublishedRecordBySlug('na-fila'))
  })

  test('when refused with no reason, it answers 422 on the note and the ad stays in the queue', async ({
    assert,
  }) => {
    const { listings, entity, useCase } = fresh(LISTING_STATUS.PENDING)

    const result = await useCase.execute({
      id: entity.id,
      decision: LISTING_REVIEW_DECISION.REFUSE,
      actor: actorDraft(),
    })

    assert.containsSubset(result.value, {
      status: 422,
      code: 'LISTING_REVIEW_NOTE_INVALID',
    })
    assert.containsSubset(result.value, { errors: {} })
    assert.equal(
      (await listings.findById(entity.id))?.snapshot().status,
      LISTING_STATUS.PENDING,
    )
  })

  test('when the ad is not in the queue, it answers 409 and changes nothing', async ({
    assert,
  }) => {
    for (const status of [
      LISTING_STATUS.DRAFT,
      LISTING_STATUS.PUBLISHED,
      LISTING_STATUS.ARCHIVED,
    ]) {
      const { entity, listings, useCase } = fresh(status)

      const result = await useCase.execute({
        id: entity.id,
        decision: LISTING_REVIEW_DECISION.APPROVE,
        actor: actorDraft(),
      })

      assert.containsSubset(result.value, {
        status: 409,
        code: 'LISTING_NOT_PENDING',
      })
      assert.equal(
        (await listings.findAnyById(entity.id))?.snapshot().status,
        status,
      )
    }
  })

  test('when the ad does not exist, it answers 404 LISTING_NOT_FOUND', async ({
    assert,
  }) => {
    const { useCase } = fresh(LISTING_STATUS.PENDING)

    const result = await useCase.execute({
      id: randomUUID(),
      decision: LISTING_REVIEW_DECISION.APPROVE,
      actor: actorDraft(),
    })

    assert.containsSubset(result.value, {
      status: 404,
      code: 'LISTING_NOT_FOUND',
    })
  })

  test('when the repository fails, it answers 500 with the module code', async ({
    assert,
  }) => {
    const useCase = new AdministratorListingReviewUseCase(
      new FailingListingRepository(),
      new StorageFake(),
      new ClockFake(),
    )

    const result = await useCase.execute({
      id: randomUUID(),
      decision: LISTING_REVIEW_DECISION.APPROVE,
      actor: actorDraft(),
    })

    assert.containsSubset(result.value, {
      status: 500,
      code: 'ADMINISTRATOR_LISTING_REVIEW_ERROR',
    })
  })
})
