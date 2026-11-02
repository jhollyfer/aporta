import app from '@adonisjs/core/services/app'
import { SORT_DIRECTION } from '@aporta/shared'
import { test } from '@japa/runner'

import Neighborhood from '#domain/neighborhood/neighborhood.entity'
import NeighborhoodLucidRepository from '#repositories/neighborhood/neighborhood.lucid.repository'
import NeighborhoodMemoryRepository from '#repositories/neighborhood/neighborhood.memory.repository'
import type NeighborhoodRepository from '#repositories/neighborhood/neighborhood.repository'
import { resetDatabase } from '#tests/database-fixtures'
import { neighborhoodDraft } from '#tests/neighborhood-fixtures'
import { ARCHIVED_AT } from '#tests/repository-fixtures'
import { seedNeighborhood } from '#tests/storefront-fixtures'

/**
 * The `NeighborhoodRepository` contract test (`_standards/domain.md` §5.4): the same cases on
 * Lucid, against Postgres, and in memory. Each implementation says how to seed a neighborhood,
 * because the contract has no write: in Lucid, a row; in memory, `put`.
 */
type Subject = {
  repository: NeighborhoodRepository
  seed(neighborhood: Neighborhood): Promise<void>
}

const IMPLEMENTATIONS = {
  lucid: async () => ({
    repository: await app.container.make(NeighborhoodLucidRepository),
    seed: async (neighborhood: Neighborhood) => {
      await seedNeighborhood(neighborhood)
    },
  }),
  memory: async () => {
    const repository = await app.container.make(NeighborhoodMemoryRepository)

    return {
      repository,
      seed: (neighborhood: Neighborhood) => {
        repository.put(neighborhood)
        return Promise.resolve()
      },
    }
  },
} satisfies Record<string, () => Promise<Subject>>

const PAGE = {
  page: 1,
  perPage: 20,
  sort: 'name',
  direction: SORT_DIRECTION.ASC,
} as const

for (const [name, make] of Object.entries(IMPLEMENTATIONS)) {
  test.group(`NeighborhoodRepository (${name})`, (group) => {
    group.each.setup(() => resetDatabase())

    test('when paginating, it returns the live ones by name, in the direction asked', async ({
      assert,
    }) => {
      const { repository, seed } = await make()
      await seed(neighborhoodDraft({ name: 'Colônia', slug: 'colonia' }))
      await seed(neighborhoodDraft({ name: 'Centro', slug: 'centro' }))
      await seed(neighborhoodDraft({ name: 'Umariaçu I', slug: 'umariacu-1' }))

      const ascending = await repository.paginate(PAGE)
      const descending = await repository.paginate({
        ...PAGE,
        direction: SORT_DIRECTION.DESC,
      })

      assert.deepEqual(
        ascending.data.map((each) => each.snapshot().slug),
        ['centro', 'colonia', 'umariacu-1'],
      )
      assert.deepEqual(
        descending.data.map((each) => each.snapshot().slug),
        ['umariacu-1', 'colonia', 'centro'],
      )
      assert.equal(ascending.meta.total, 3)
    })

    test('when one is in the trash, it does not come back', async ({
      assert,
    }) => {
      const { repository, seed } = await make()
      const live = neighborhoodDraft({ slug: 'centro', name: 'Centro' })
      const trashed = Neighborhood.restore({
        ...neighborhoodDraft({ slug: 'colonia', name: 'Colônia' }).snapshot(),
        deletedAt: ARCHIVED_AT,
      })
      await seed(live)
      await seed(trashed)

      const result = await repository.paginate(PAGE)

      assert.deepEqual(
        result.data.map((each) => each.id),
        [live.id],
      )
      assert.equal(result.meta.total, 1)
    })

    test('when searching, it matches the name without case', async ({
      assert,
    }) => {
      const { repository, seed } = await make()
      await seed(
        neighborhoodDraft({ name: 'Cidade Nova', slug: 'cidade-nova' }),
      )
      await seed(neighborhoodDraft({ name: 'Centro', slug: 'centro' }))

      const result = await repository.paginate({ ...PAGE, search: 'NOVA' })

      assert.deepEqual(
        result.data.map((each) => each.snapshot().slug),
        ['cidade-nova'],
      )
    })

    test('when the page is past the first, it returns the slice and the meta of the paginator', async ({
      assert,
    }) => {
      const { repository, seed } = await make()
      for (const slug of ['a', 'b', 'c']) {
        await seed(neighborhoodDraft({ slug, name: slug }))
      }

      const result = await repository.paginate({ ...PAGE, page: 2, perPage: 2 })

      assert.deepEqual(
        result.data.map((each) => each.snapshot().slug),
        ['c'],
      )
      assert.containsSubset(result.meta, {
        total: 3,
        perPage: 2,
        currentPage: 2,
        lastPage: 2,
      })
    })

    test('when restored from a row, the center comes back as numbers', async ({
      assert,
    }) => {
      const { repository, seed } = await make()
      await seed(neighborhoodDraft({ lat: -4.3775, lng: -70.0312 }))

      const [found] = (await repository.paginate(PAGE)).data

      assert.strictEqual(found?.snapshot().lat, -4.3775)
      assert.strictEqual(found?.snapshot().lng, -70.0312)
    })
  })
}
