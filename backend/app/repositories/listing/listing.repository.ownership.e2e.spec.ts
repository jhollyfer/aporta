import { LISTING_STATUS } from '@aporta/shared'
import { test } from '@japa/runner'

import { resetDatabase } from '#tests/database-fixtures'
import { listingIn } from '#tests/listing-fixtures'
import { IMPLEMENTATIONS } from '#tests/listing-repository-subject'
import { ARCHIVED_AT } from '#tests/repository-fixtures'

/**
 * The ownership question of the `ListingRepository` contract (`_standards/domain.md` §5.4), on its
 * own file because the main contract spec is at the size limit: the same harness, Lucid against
 * Postgres and in memory.
 */
for (const [name, make] of Object.entries(IMPLEMENTATIONS)) {
  test.group(`ListingRepository ownership (${name})`, (group) => {
    group.each.setup(() => resetDatabase())

    test('when asking whether an account has a live ad, any status outside the trash counts, and the trash and other accounts do not', async ({
      assert,
    }) => {
      const {
        repository,
        neighborhood: createNeighborhood,
        account,
        seed,
      } = await make()
      const centro = await createNeighborhood('centro', 'Centro')
      const withDraft = await account()
      const withTrashOnly = await account()
      const without = await account()
      await seed(
        listingIn(LISTING_STATUS.DRAFT, {
          slug: 'rascunho',
          neighborhoodId: centro,
          ownerId: withDraft,
        }),
      )
      await seed(
        listingIn(
          LISTING_STATUS.ARCHIVED,
          {
            slug: 'arquivada',
            neighborhoodId: centro,
            ownerId: withTrashOnly,
          },
          ARCHIVED_AT,
        ),
      )

      assert.isTrue(await repository.existsLiveByOwner(withDraft))
      assert.isFalse(await repository.existsLiveByOwner(withTrashOnly))
      assert.isFalse(await repository.existsLiveByOwner(without))
    })
  })
}
