import { randomUUID } from 'node:crypto'

import app from '@adonisjs/core/services/app'
import {
  LISTING_PERIOD,
  LISTING_STATUS,
  LISTING_TYPE,
  PHOTO_ENVIRONMENT,
  SORT_DIRECTION,
} from '@aporta/shared'
import { test } from '@japa/runner'

import type Listing from '#domain/listing/listing.entity'
import ListingLucidRepository from '#repositories/listing/listing.lucid.repository'
import ListingMemoryRepository, {
  type ListingStamps,
} from '#repositories/listing/listing.memory.repository'
import type ListingRepository from '#repositories/listing/listing.repository'
import { resetDatabase } from '#tests/database-fixtures'
import type { listingDraft } from '#tests/listing-fixtures'
import { listingIn } from '#tests/listing-fixtures'
import { ARCHIVED_AT } from '#tests/repository-fixtures'
import { neighborhood, seedListing } from '#tests/storefront-fixtures'

/**
 * The `ListingRepository` contract test (`_standards/domain.md` §5.4): the same cases on Lucid,
 * against Postgres, and in memory. Each implementation says how to create a neighborhood and seed a
 * listing, because the contract has no write: in Lucid, rows; in memory, `put`.
 */
type Subject = {
  repository: ListingRepository
  neighborhood(slug: string, name: string): Promise<string>
  seed(listing: Listing, stamps?: ListingStamps): Promise<void>
}

const IMPLEMENTATIONS = {
  lucid: async () => ({
    repository: await app.container.make(ListingLucidRepository),
    neighborhood: async (slug: string, name: string) => {
      const row = await neighborhood({ slug, name })
      return row.id
    },
    seed: async (listing: Listing, stamps?: ListingStamps) => {
      await seedListing(listing, stamps)
    },
  }),
  memory: async () => {
    const repository = await app.container.make(ListingMemoryRepository)

    return {
      repository,
      neighborhood: (slug: string, name: string) => {
        const id = randomUUID()
        repository.putNeighborhood(id, { slug, name })
        return Promise.resolve(id)
      },
      seed: (listing: Listing, stamps?: ListingStamps) => {
        repository.put(listing, stamps)
        return Promise.resolve()
      },
    }
  },
} satisfies Record<string, () => Promise<Subject>>

const PAGE = {
  page: 1,
  perPage: 20,
  sort: 'createdAt',
  direction: SORT_DIRECTION.DESC,
} as const

for (const [name, make] of Object.entries(IMPLEMENTATIONS)) {
  test.group(`ListingRepository (${name})`, (group) => {
    group.each.setup(() => resetDatabase())

    test('when reading by slug, it returns the published one with its neighborhood, owner and photos in order', async ({
      assert,
    }) => {
      const {
        repository,
        neighborhood: createNeighborhood,
        seed,
      } = await make()
      const centro = await createNeighborhood('centro', 'Centro')
      const verifiedAt = new Date('2026-10-30T12:00:00.000Z')
      const entity = listingIn(LISTING_STATUS.PUBLISHED, {
        slug: 'kitnet-centro-porto',
        neighborhoodId: centro,
        owner: {
          name: 'Seu Raimundo',
          whatsapp: '5597999990002',
          verifiedAt,
        },
        photos: [
          { id: randomUUID(), environment: PHOTO_ENVIRONMENT.KITCHEN },
          { id: randomUUID(), environment: PHOTO_ENVIRONMENT.FACADE },
          { id: randomUUID(), environment: PHOTO_ENVIRONMENT.BEDROOM },
        ],
      })
      await seed(entity)

      const record = await repository.findPublishedRecordBySlug(
        'kitnet-centro-porto',
      )
      const snapshot = record?.listing.snapshot()

      assert.deepEqual(record?.neighborhood, { slug: 'centro', name: 'Centro' })
      assert.equal(snapshot?.id, entity.id)
      assert.equal(snapshot?.availableFrom, '2027-01-15')
      assert.deepEqual(snapshot?.periods, [
        LISTING_PERIOD.SEMESTER,
        LISTING_PERIOD.MONTHLY,
      ])
      assert.deepEqual(snapshot?.costs, {
        water: true,
        electricity: true,
        internet: true,
      })
      assert.equal(snapshot?.owner.verifiedAt?.getTime(), verifiedAt.getTime())
      assert.deepEqual(
        snapshot?.photos.map((photo) => photo.environment),
        [
          PHOTO_ENVIRONMENT.KITCHEN,
          PHOTO_ENVIRONMENT.FACADE,
          PHOTO_ENVIRONMENT.BEDROOM,
        ],
      )
      assert.instanceOf(record?.createdAt, Date)
      assert.instanceOf(record?.updatedAt, Date)
    })

    test('when the ad is DRAFT, PENDING, ARCHIVED, trashed or unknown, the slug read and the listing answer as if it did not exist', async ({
      assert,
    }) => {
      const {
        repository,
        neighborhood: createNeighborhood,
        seed,
      } = await make()
      const centro = await createNeighborhood('centro', 'Centro')
      const live = listingIn(LISTING_STATUS.PUBLISHED, {
        slug: 'no-ar',
        neighborhoodId: centro,
      })
      await seed(live)

      for (const [slug, status, deletedAt] of [
        ['rascunho', LISTING_STATUS.DRAFT, null],
        ['em-analise', LISTING_STATUS.PENDING, null],
        ['arquivado', LISTING_STATUS.ARCHIVED, null],
        ['na-lixeira', LISTING_STATUS.PUBLISHED, ARCHIVED_AT],
      ] as const) {
        await seed(
          listingIn(status, { slug, neighborhoodId: centro }, deletedAt),
        )

        assert.isNull(await repository.findPublishedRecordBySlug(slug), slug)
      }

      assert.isNull(await repository.findPublishedRecordBySlug('nenhum'))

      const page = await repository.paginatePublished(PAGE)

      assert.deepEqual(
        page.data.map((record) => record.listing.id),
        [live.id],
      )
      assert.equal(page.meta.total, 1)
    })

    test('when filtering by type, neighborhood and period, it narrows each one', async ({
      assert,
    }) => {
      const {
        repository,
        neighborhood: createNeighborhood,
        seed,
      } = await make()
      const centro = await createNeighborhood('centro', 'Centro')
      const colonia = await createNeighborhood('colonia', 'Colônia')
      await seed(
        listingDraftPublished({ slug: 'kitnet', neighborhoodId: centro }),
      )
      await seed(
        listingDraftPublished({
          slug: 'quarto',
          type: LISTING_TYPE.ROOM,
          neighborhoodId: colonia,
          periods: [LISTING_PERIOD.ACADEMIC_YEAR],
        }),
      )

      const slugs = async (criteria: object) =>
        (await repository.paginatePublished({ ...PAGE, ...criteria })).data.map(
          (record) => record.listing.snapshot().slug,
        )

      assert.deepEqual(await slugs({ type: LISTING_TYPE.ROOM }), ['quarto'])
      assert.deepEqual(await slugs({ neighborhood: 'centro' }), ['kitnet'])
      assert.deepEqual(await slugs({ neighborhood: 'nenhum' }), [])
      assert.deepEqual(await slugs({ period: LISTING_PERIOD.ACADEMIC_YEAR }), [
        'quarto',
      ])
      assert.sameMembers(await slugs({ period: LISTING_PERIOD.SEMESTER }), [
        'kitnet',
      ])
    })

    test('when filtering by price, a daily-only ad counts as thirty days, and the range limits are inclusive', async ({
      assert,
    }) => {
      const {
        repository,
        neighborhood: createNeighborhood,
        seed,
      } = await make()
      const centro = await createNeighborhood('centro', 'Centro')
      await seed(
        listingDraftPublished({
          slug: 'barato',
          priceMonthly: 600,
          neighborhoodId: centro,
        }),
      )
      await seed(
        listingDraftPublished({
          slug: 'medio',
          priceMonthly: 900,
          neighborhoodId: centro,
        }),
      )
      // 120 a day is 3600 a month: it must not pass for "cheap" just because 120 < 600.
      await seed(
        listingDraftPublished({
          slug: 'hotel',
          priceMonthly: null,
          priceDaily: 120,
          neighborhoodId: centro,
        }),
      )

      const slugs = async (criteria: object) =>
        (
          await repository.paginatePublished({
            ...PAGE,
            sort: 'price',
            direction: SORT_DIRECTION.ASC,
            ...criteria,
          })
        ).data.map((record) => record.listing.snapshot().slug)

      assert.deepEqual(await slugs({ minPrice: 600, maxPrice: 900 }), [
        'barato',
        'medio',
      ])
      assert.deepEqual(await slugs({ maxPrice: 1000 }), ['barato', 'medio'])
      assert.deepEqual(await slugs({ minPrice: 3600 }), ['hotel'])
      assert.deepEqual(await slugs({ minPrice: 3601 }), [])
    })

    test('when sorting by price or by date, it follows the column and the direction', async ({
      assert,
    }) => {
      const {
        repository,
        neighborhood: createNeighborhood,
        seed,
      } = await make()
      const centro = await createNeighborhood('centro', 'Centro')
      await seed(
        listingDraftPublished({
          slug: 'a',
          priceMonthly: 900,
          neighborhoodId: centro,
        }),
        stamps('2026-01-01', '2026-03-01'),
      )
      await seed(
        listingDraftPublished({
          slug: 'b',
          priceMonthly: 600,
          neighborhoodId: centro,
        }),
        stamps('2026-02-01', '2026-02-01'),
      )
      await seed(
        listingDraftPublished({
          slug: 'c',
          priceMonthly: null,
          priceDaily: 40,
          neighborhoodId: centro,
        }),
        stamps('2026-03-01', '2026-01-01'),
      )

      const slugs = async (
        sort: 'price' | 'createdAt' | 'updatedAt',
        direction: 'asc' | 'desc',
      ) =>
        (
          await repository.paginatePublished({ ...PAGE, sort, direction })
        ).data.map((record) => record.listing.snapshot().slug)

      assert.deepEqual(await slugs('price', 'asc'), ['b', 'a', 'c'])
      assert.deepEqual(await slugs('price', 'desc'), ['c', 'a', 'b'])
      assert.deepEqual(await slugs('createdAt', 'desc'), ['c', 'b', 'a'])
      assert.deepEqual(await slugs('updatedAt', 'desc'), ['a', 'b', 'c'])
    })

    test('when searching, it matches title and description and does not escape the published cut', async ({
      assert,
    }) => {
      const {
        repository,
        neighborhood: createNeighborhood,
        seed,
      } = await make()
      const centro = await createNeighborhood('centro', 'Centro')
      await seed(
        listingDraftPublished({
          slug: 'no-ar',
          title: 'Casa com quintal',
          description: 'Perto da UFAM.',
          neighborhoodId: centro,
        }),
      )
      // It matches by **description**, the column after the first, and it is a draft: with a loose
      // `OR` it would show up for whoever typed a word from it.
      await seed(
        listingIn(LISTING_STATUS.DRAFT, {
          slug: 'rascunho',
          title: 'Outra',
          description: 'Quintal grande, perto da UFAM.',
          neighborhoodId: centro,
        }),
      )

      const page = await repository.paginatePublished({
        ...PAGE,
        search: 'ufam',
      })

      assert.deepEqual(
        page.data.map((record) => record.listing.snapshot().slug),
        ['no-ar'],
      )
    })

    test('when the page is past the first, it returns the slice and the meta of the paginator', async ({
      assert,
    }) => {
      const {
        repository,
        neighborhood: createNeighborhood,
        seed,
      } = await make()
      const centro = await createNeighborhood('centro', 'Centro')
      for (const slug of ['a', 'b', 'c']) {
        await seed(listingDraftPublished({ slug, neighborhoodId: centro }))
      }

      const page = await repository.paginatePublished({
        ...PAGE,
        page: 2,
        perPage: 2,
      })

      assert.lengthOf(page.data, 1)
      assert.containsSubset(page.meta, {
        total: 3,
        perPage: 2,
        currentPage: 2,
        lastPage: 2,
      })
    })
  })
}

/** A published listing built without a database. */
function listingDraftPublished(input: Parameters<typeof listingDraft>[0]) {
  return listingIn(LISTING_STATUS.PUBLISHED, input)
}

function stamps(createdAt: string, updatedAt: string): ListingStamps {
  return {
    createdAt: new Date(`${createdAt}T12:00:00.000Z`),
    updatedAt: new Date(`${updatedAt}T12:00:00.000Z`),
  }
}
