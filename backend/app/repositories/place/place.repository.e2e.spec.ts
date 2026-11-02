import { randomUUID } from 'node:crypto'

import app from '@adonisjs/core/services/app'
import { PLACE_CATEGORY, SORT_DIRECTION } from '@aporta/shared'
import { test } from '@japa/runner'

import Place from '#domain/place/place.entity'
import PlaceLucidRepository from '#repositories/place/place.lucid.repository'
import PlaceMemoryRepository from '#repositories/place/place.memory.repository'
import type PlaceRepository from '#repositories/place/place.repository'
import { resetDatabase } from '#tests/database-fixtures'
import { placeDraft } from '#tests/place-fixtures'
import { ARCHIVED_AT } from '#tests/repository-fixtures'
import { neighborhood, seedPlace } from '#tests/storefront-fixtures'

/**
 * The `PlaceRepository` contract test (`_standards/domain.md` §5.4): the same cases on Lucid,
 * against Postgres, and in memory. Each implementation says how to create a neighborhood and
 * seed a place, because the contract has no write.
 */
type Subject = {
  repository: PlaceRepository
  neighborhood(slug: string, name: string): Promise<string>
  seed(place: Place): Promise<void>
}

const IMPLEMENTATIONS = {
  lucid: async () => ({
    repository: await app.container.make(PlaceLucidRepository),
    neighborhood: async (slug: string, name: string) => {
      const row = await neighborhood({ slug, name })
      return row.id
    },
    seed: async (place: Place) => {
      await seedPlace(place)
    },
  }),
  memory: async () => {
    const repository = await app.container.make(PlaceMemoryRepository)

    return {
      repository,
      neighborhood: (slug: string, name: string) => {
        const id = randomUUID()
        repository.putNeighborhood(id, { slug, name })
        return Promise.resolve(id)
      },
      seed: (place: Place) => {
        repository.put(place)
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
  test.group(`PlaceRepository (${name})`, (group) => {
    group.each.setup(() => resetDatabase())

    test('when paginating, it returns the live ones by name with the neighborhood name and slug', async ({
      assert,
    }) => {
      const {
        repository,
        neighborhood: createNeighborhood,
        seed,
      } = await make()
      const centro = await createNeighborhood('centro', 'Centro')
      await seed(
        placeDraft({ name: 'Tacacá da Praça', neighborhoodId: centro }),
      )
      await seed(
        placeDraft({ name: 'Peixaria do Porto', neighborhoodId: centro }),
      )

      const result = await repository.paginate(PAGE)

      assert.deepEqual(
        result.data.map((each) => each.place.snapshot().name),
        ['Peixaria do Porto', 'Tacacá da Praça'],
      )
      assert.deepEqual(result.data[0]?.neighborhood, {
        slug: 'centro',
        name: 'Centro',
      })
    })

    test('when filtering by category, it returns only that tab', async ({
      assert,
    }) => {
      const {
        repository,
        neighborhood: createNeighborhood,
        seed,
      } = await make()
      const centro = await createNeighborhood('centro', 'Centro')
      await seed(placeDraft({ name: 'Peixaria', neighborhoodId: centro }))
      await seed(
        placeDraft({
          name: 'Festival',
          category: PLACE_CATEGORY.EVENT,
          date: '2027-06-26',
          neighborhoodId: centro,
        }),
      )

      const result = await repository.paginate({
        ...PAGE,
        category: PLACE_CATEGORY.EVENT,
      })

      assert.deepEqual(
        result.data.map((each) => each.place.snapshot().name),
        ['Festival'],
      )
      assert.equal(result.data[0]?.place.snapshot().date, '2027-06-26')
    })

    test('when one is in the trash, it does not come back', async ({
      assert,
    }) => {
      const {
        repository,
        neighborhood: createNeighborhood,
        seed,
      } = await make()
      const centro = await createNeighborhood('centro', 'Centro')
      const live = placeDraft({ name: 'Viva', neighborhoodId: centro })
      await seed(live)
      await seed(
        Place.restore({
          ...placeDraft({
            name: 'Arquivada',
            neighborhoodId: centro,
          }).snapshot(),
          deletedAt: ARCHIVED_AT,
        }),
      )

      const result = await repository.paginate(PAGE)

      assert.deepEqual(
        result.data.map((each) => each.place.id),
        [live.id],
      )
    })

    test('when searching, it does not escape the category filter', async ({
      assert,
    }) => {
      const {
        repository,
        neighborhood: createNeighborhood,
        seed,
      } = await make()
      const centro = await createNeighborhood('centro', 'Centro')
      await seed(
        placeDraft({
          name: 'Bar do Beiradão',
          category: PLACE_CATEGORY.DRINK,
          description: 'Cerveja gelada com peixe frito.',
          neighborhoodId: centro,
        }),
      )
      // It matches the search by **description**, the column after the first, and is another
      // category: with a loose `OR` it would show up under `?category=DRINK`.
      await seed(
        placeDraft({
          name: 'Peixaria',
          description: 'Peixe na brasa.',
          neighborhoodId: centro,
        }),
      )

      const result = await repository.paginate({
        ...PAGE,
        search: 'peixe',
        category: PLACE_CATEGORY.DRINK,
      })

      assert.deepEqual(
        result.data.map((each) => each.place.snapshot().name),
        ['Bar do Beiradão'],
      )
    })
  })
}
