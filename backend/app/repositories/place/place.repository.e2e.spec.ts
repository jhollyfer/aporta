import { randomUUID } from 'node:crypto'

import app from '@adonisjs/core/services/app'
import { PLACE_CATEGORY, SORT_DIRECTION, TRASHED_MODE } from '@aporta/shared'
import { test } from '@japa/runner'

import Place from '#domain/place/place.entity'
import PlaceLucidRepository from '#repositories/place/place.lucid.repository'
import PlaceMemoryRepository from '#repositories/place/place.memory.repository'
import type PlaceRepository from '#repositories/place/place.repository'
import { resetDatabase } from '#tests/database-fixtures'
import { placeDraft } from '#tests/place-fixtures'
import { ARCHIVED_AT, recorded } from '#tests/repository-fixtures'
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

    test('when asking for the trash, `only` returns the archived and `with` returns both', async ({
      assert,
    }) => {
      const {
        repository,
        neighborhood: createNeighborhood,
        seed,
      } = await make()
      const centro = await createNeighborhood('centro', 'Centro')
      const live = placeDraft({ name: 'Viva', neighborhoodId: centro })
      const gone = placeDraft({ name: 'Arquivada', neighborhoodId: centro })
      gone.archive(ARCHIVED_AT)
      await seed(live)
      await seed(gone)

      const only = await repository.paginate({
        ...PAGE,
        trashed: TRASHED_MODE.ONLY,
      })
      const both = await repository.paginate({
        ...PAGE,
        trashed: TRASHED_MODE.WITH,
      })

      assert.deepEqual(
        only.data.map((each) => each.place.id),
        [gone.id],
      )
      assert.deepEqual(
        both.data.map((each) => each.place.snapshot().name),
        ['Arquivada', 'Viva'],
      )
      assert.deepEqual(only.data[0]?.place.snapshot().deletedAt, ARCHIVED_AT)
    })

    test('when finding by id, it returns the place with its neighborhood even in the trash, and null when missing', async ({
      assert,
    }) => {
      const {
        repository,
        neighborhood: createNeighborhood,
        seed,
      } = await make()
      const centro = await createNeighborhood('centro', 'Centro')
      const gone = placeDraft({ neighborhoodId: centro })
      gone.archive(ARCHIVED_AT)
      await seed(gone)

      const found = await repository.findAnyRecordById(gone.id)
      const missing = await repository.findAnyRecordById(randomUUID())

      assert.equal(found?.place.id, gone.id)
      assert.deepEqual(found?.neighborhood, { slug: 'centro', name: 'Centro' })
      assert.isNull(missing)
    })

    test('when saving, it inserts a new place and updates an existing one, keeping the trash', async ({
      assert,
    }) => {
      const { repository, neighborhood: createNeighborhood } = await make()
      const centro = await createNeighborhood('centro', 'Centro')
      const place = placeDraft({
        category: PLACE_CATEGORY.EVENT,
        date: '2027-06-26',
        name: 'Festival',
        neighborhoodId: centro,
      })

      const inserted = recorded(await repository.save(place))
      place.change({
        ...place.snapshot(),
        name: 'Festival dos Bois',
        date: '2027-06-27',
        whatsapp: '5597999990001',
      })
      place.archive(ARCHIVED_AT)
      const updated = recorded(await repository.save(place))

      assert.equal(inserted.place.snapshot().date, '2027-06-26')
      assert.containsSubset(updated.place.snapshot(), {
        id: place.id,
        name: 'Festival dos Bois',
        date: '2027-06-27',
        whatsapp: '5597999990001',
        deletedAt: ARCHIVED_AT,
      })
      assert.deepEqual(updated.neighborhood, {
        slug: 'centro',
        name: 'Centro',
      })
      const both = await repository.paginate({
        ...PAGE,
        trashed: TRASHED_MODE.WITH,
      })
      assert.lengthOf(both.data, 1)
    })

    test('when deleting, the place is gone for good', async ({ assert }) => {
      const {
        repository,
        neighborhood: createNeighborhood,
        seed,
      } = await make()
      const centro = await createNeighborhood('centro', 'Centro')
      const gone = placeDraft({ neighborhoodId: centro })
      const kept = placeDraft({ name: 'Fica', neighborhoodId: centro })
      await seed(gone)
      await seed(kept)

      await repository.delete(gone)

      assert.isNull(await repository.findAnyRecordById(gone.id))
      assert.isNotNull(await repository.findAnyRecordById(kept.id))
    })
  })
}
