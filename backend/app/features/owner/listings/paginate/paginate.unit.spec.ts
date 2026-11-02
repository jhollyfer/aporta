import { LISTING_STATUS } from '@aporta/shared'
import { test } from '@japa/runner'

import OwnerListingPaginateUseCase from './paginate.use-case.ts'

import ListingMemoryRepository from '#repositories/listing/listing.memory.repository'
import NeighborhoodMemoryRepository from '#repositories/neighborhood/neighborhood.memory.repository'
import StorageFake from '#services/storage/storage.fake'
import {
  FailingListingRepository,
  listingIn,
  centroIn,
} from '#tests/listing-fixtures'
import { ARCHIVED_AT } from '#tests/repository-fixtures'
import { actorDraft } from '#tests/user-fixtures'

/** The two memory repositories, agreeing on one neighborhood (`centro`). */
function fresh() {
  const listings = new ListingMemoryRepository()
  const neighborhoods = new NeighborhoodMemoryRepository()
  const centro = centroIn(listings, neighborhoods)

  return { listings, neighborhoods, centro }
}

test.group('owner > listings > paginate (unit)', () => {
  test('when listing, it brings only the ads of the session account, any status outside the trash', async ({
    assert,
  }) => {
    const { centro, listings } = fresh()
    const actor = actorDraft()
    const mine = (slug: string, status: Parameters<typeof listingIn>[0]) =>
      listings.put(
        listingIn(status, {
          slug,
          neighborhoodId: centro.id,
          ownerId: actor.id,
        }),
      )
    mine('publicada', LISTING_STATUS.PUBLISHED)
    mine('pendente', LISTING_STATUS.PENDING)
    mine('rascunho', LISTING_STATUS.DRAFT)
    listings.put(
      listingIn(LISTING_STATUS.PUBLISHED, {
        slug: 'de-outro',
        neighborhoodId: centro.id,
        ownerId: actorDraft().id,
      }),
    )
    listings.put(
      listingIn(
        LISTING_STATUS.ARCHIVED,
        { slug: 'arquivada', neighborhoodId: centro.id, ownerId: actor.id },
        ARCHIVED_AT,
      ),
    )
    const useCase = new OwnerListingPaginateUseCase(listings, new StorageFake())

    const all = await useCase.execute({ actor })
    const pending = await useCase.execute({
      actor,
      status: LISTING_STATUS.PENDING,
    })

    if (all.isLeft() || pending.isLeft()) return assert.fail('paginate failed')

    assert.sameMembers(
      all.value.data.map((each) => each.slug),
      ['publicada', 'pendente', 'rascunho'],
    )
    assert.equal(all.value.meta.total, 3)
    assert.deepEqual(
      pending.value.data.map((each) => each.status),
      [LISTING_STATUS.PENDING],
    )
  })

  test('when the account has no ads, it answers an empty page and not the ads of someone else', async ({
    assert,
  }) => {
    const { centro, listings } = fresh()
    listings.put(
      listingIn(LISTING_STATUS.PUBLISHED, {
        slug: 'de-outro',
        neighborhoodId: centro.id,
        ownerId: actorDraft().id,
      }),
    )
    const useCase = new OwnerListingPaginateUseCase(listings, new StorageFake())

    const result = await useCase.execute({ actor: actorDraft() })

    assert.containsSubset(result.value, { meta: { total: 0 }, data: [] })
  })

  test('when the repository fails, it answers 500 with the module code', async ({
    assert,
  }) => {
    const useCase = new OwnerListingPaginateUseCase(
      new FailingListingRepository(),
      new StorageFake(),
    )

    const result = await useCase.execute({ actor: actorDraft() })

    assert.containsSubset(result.value, {
      status: 500,
      code: 'OWNER_LISTING_PAGINATE_ERROR',
    })
  })
})
