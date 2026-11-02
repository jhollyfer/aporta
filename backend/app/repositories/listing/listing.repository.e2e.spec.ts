import { randomUUID } from 'node:crypto'

import app from '@adonisjs/core/services/app'
import {
  LISTING_PERIOD,
  LISTING_STATUS,
  LISTING_TYPE,
  PHOTO_ENVIRONMENT,
  SORT_DIRECTION,
  UPLOAD_STATUS,
  type Either,
  type StorageFileShowResponse,
} from '@aporta/shared'
import { test } from '@japa/runner'

import { UserFactory } from '#database/factories/user.factory'
import type Listing from '#domain/listing/listing.entity'
import ListingLucidRepository from '#repositories/listing/listing.lucid.repository'
import ListingMemoryRepository, {
  type ListingStamps,
} from '#repositories/listing/listing.memory.repository'
import type ListingRepository from '#repositories/listing/listing.repository'
import LucidMapping from '#repositories/shared/lucid-mapping'
import { resetDatabase, storageRecord } from '#tests/database-fixtures'
import { listingDraft, listingIn } from '#tests/listing-fixtures'
import { ARCHIVED_AT, storageFile } from '#tests/repository-fixtures'
import { neighborhood, seedListing } from '#tests/storefront-fixtures'

/**
 * The `ListingRepository` contract test (`_standards/domain.md` §5.4): the same cases on Lucid,
 * against Postgres, and in memory. Each implementation says how to create what a listing points
 * to (a neighborhood, an account, a file) and how to seed a listing the way the storefront finds
 * it: in Lucid, rows; in memory, `put`.
 */
type Subject = {
  repository: ListingRepository
  neighborhood(slug: string, name: string): Promise<string>
  /** An account that exists for the implementation: `owner_id` is a foreign key to `users`. */
  account(): Promise<string>
  /** A live `UPLOADED` file the account sent, which a photo can show. */
  file(ownerId: string): Promise<StorageFileShowResponse>
  /** A file a photo may point to but a visitor must not be given: it never finished uploading. */
  unfinishedFile(ownerId: string): Promise<StorageFileShowResponse>
  seed(listing: Listing, stamps?: ListingStamps): Promise<void>
}

const IMPLEMENTATIONS = {
  lucid: async () => ({
    repository: await app.container.make(ListingLucidRepository),
    neighborhood: async (slug: string, name: string) => {
      const row = await neighborhood({ slug, name })
      return row.id
    },
    account: async () => (await UserFactory.create()).id,
    file: async (ownerId: string) => {
      const row = await storageRecord({ ownerId })
      return fileOf(LucidMapping.file(row))
    },
    unfinishedFile: async (ownerId: string) => {
      const row = await storageRecord({
        ownerId,
        status: UPLOAD_STATUS.PENDING,
      })
      return fileOf(LucidMapping.file(row))
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
      account: () => Promise.resolve(randomUUID()),
      file: () => {
        const file = storageFile()
        repository.putFile(file)
        return Promise.resolve(file)
      },
      // The memory repository serves only the files that were put.
      unfinishedFile: () => Promise.resolve(storageFile()),
      seed: (listing: Listing, stamps?: ListingStamps) => {
        repository.put(listing, stamps)
        return Promise.resolve()
      },
    }
  },
} satisfies Record<string, () => Promise<Subject>>

/** The mapped file, or the failure on the spot: a row the spec just created is never missing. */
function fileOf(file: StorageFileShowResponse | null): StorageFileShowResponse {
  if (!file) throw new Error('storage row missing')

  return file
}

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
          {
            id: randomUUID(),
            environment: PHOTO_ENVIRONMENT.KITCHEN,
            storageId: null,
          },
          {
            id: randomUUID(),
            environment: PHOTO_ENVIRONMENT.FACADE,
            storageId: null,
          },
          {
            id: randomUUID(),
            environment: PHOTO_ENVIRONMENT.BEDROOM,
            storageId: null,
          },
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

    test('when reading for the owner, it returns any status outside the trash, and the storefront read still hides it', async ({
      assert,
    }) => {
      const {
        repository,
        neighborhood: createNeighborhood,
        account,
        seed,
      } = await make()
      const centro = await createNeighborhood('centro', 'Centro')
      const ownerId = await account()
      const pending = listingIn(LISTING_STATUS.PENDING, {
        slug: 'em-analise',
        neighborhoodId: centro,
        ownerId,
      })
      const trashed = listingIn(
        LISTING_STATUS.ARCHIVED,
        { slug: 'arquivado', neighborhoodId: centro, ownerId },
        ARCHIVED_AT,
      )
      await seed(pending)
      await seed(trashed)

      const entity = await repository.findById(pending.id)
      const record = await repository.findRecordById(pending.id)

      assert.equal(entity?.snapshot().ownerId, ownerId)
      assert.isTrue(entity?.isOwnedBy(ownerId))
      assert.deepEqual(record?.neighborhood, { slug: 'centro', name: 'Centro' })
      assert.isNull(await repository.findById(trashed.id))
      assert.isNull(await repository.findRecordById(trashed.id))
      assert.isNull(await repository.findById(randomUUID()))
      assert.isNull(await repository.findPublishedRecordBySlug('em-analise'))
    })

    test('when paginating for an owner, only his live ads come back, by status and search, and never another account', async ({
      assert,
    }) => {
      const {
        repository,
        neighborhood: createNeighborhood,
        account,
        seed,
      } = await make()
      const centro = await createNeighborhood('centro', 'Centro')
      const mine = await account()
      const other = await account()
      const draft = (
        slug: string,
        status: Parameters<typeof listingIn>[0],
        ownerId: string | null,
        extra: Parameters<typeof listingIn>[1] = {},
      ) =>
        seed(
          listingIn(status, {
            slug,
            neighborhoodId: centro,
            ownerId,
            ...extra,
          }),
        )
      await draft('minha-publicada', LISTING_STATUS.PUBLISHED, mine)
      await draft('minha-pendente', LISTING_STATUS.PENDING, mine, {
        title: 'Casa com quintal',
      })
      await draft('dela', LISTING_STATUS.PUBLISHED, other)
      await draft('sem-dono', LISTING_STATUS.PUBLISHED, null)
      await seed(
        listingIn(
          LISTING_STATUS.ARCHIVED,
          { slug: 'minha-arquivada', neighborhoodId: centro, ownerId: mine },
          ARCHIVED_AT,
        ),
      )

      const slugs = async (criteria: object) =>
        (
          await repository.paginateOwned({
            ...PAGE,
            ownerId: mine,
            ...criteria,
          })
        ).data
          .map((record) => record.listing.snapshot().slug)
          .sort()

      assert.deepEqual(await slugs({}), ['minha-pendente', 'minha-publicada'])
      assert.deepEqual(await slugs({ status: LISTING_STATUS.PENDING }), [
        'minha-pendente',
      ])
      assert.deepEqual(await slugs({ search: 'quintal' }), ['minha-pendente'])
      assert.deepEqual(await slugs({ sort: 'price', direction: 'asc' }), [
        'minha-pendente',
        'minha-publicada',
      ])
      assert.deepEqual(
        (await repository.paginateOwned({ ...PAGE, ownerId: randomUUID() }))
          .data,
        [],
      )
    })

    test('when saving a new ad, it comes back as written: owner, photos in order, files of the live uploads only', async ({
      assert,
    }) => {
      const {
        repository,
        neighborhood: createNeighborhood,
        account,
        file,
        unfinishedFile,
      } = await make()
      const centro = await createNeighborhood('centro', 'Centro')
      const ownerId = await account()
      const live = await file(ownerId)
      const unfinished = await unfinishedFile(ownerId)
      const entity = listingDraft({
        slug: 'nova-kitnet',
        neighborhoodId: centro,
        ownerId,
        photos: [
          {
            id: randomUUID(),
            environment: PHOTO_ENVIRONMENT.KITCHEN,
            storageId: live.id,
          },
          {
            id: randomUUID(),
            environment: PHOTO_ENVIRONMENT.FACADE,
            storageId: unfinished.id,
          },
          {
            id: randomUUID(),
            environment: PHOTO_ENVIRONMENT.BEDROOM,
            storageId: null,
          },
        ],
      }).submit()

      const saved = await repository.save(entity)

      if (saved.isLeft()) throw new Error(JSON.stringify(saved.value))
      const snapshot = saved.value.listing.snapshot()
      assert.equal(snapshot.status, LISTING_STATUS.PENDING)
      assert.equal(snapshot.ownerId, ownerId)
      assert.deepEqual(
        snapshot.photos.map((photo) => photo.environment),
        [
          PHOTO_ENVIRONMENT.KITCHEN,
          PHOTO_ENVIRONMENT.FACADE,
          PHOTO_ENVIRONMENT.BEDROOM,
        ],
      )
      assert.deepEqual(
        snapshot.photos.map((photo) => photo.storageId),
        [live.id, unfinished.id, null],
      )
      assert.deepEqual(
        saved.value.files.map((each) => each.id),
        [live.id],
      )
      assert.deepEqual(saved.value.neighborhood, {
        slug: 'centro',
        name: 'Centro',
      })
      assert.instanceOf(saved.value.createdAt, Date)
      assert.equal((await repository.findById(entity.id))?.id, entity.id)
    })

    test('when saving an existing ad, the change and the whole gallery replace what was there', async ({
      assert,
    }) => {
      const {
        repository,
        neighborhood: createNeighborhood,
        account,
        file,
      } = await make()
      const centro = await createNeighborhood('centro', 'Centro')
      const ownerId = await account()
      const first = await file(ownerId)
      const second = await file(ownerId)
      const entity = listingDraft({
        slug: 'editavel',
        neighborhoodId: centro,
        ownerId,
        photos: [
          {
            id: randomUUID(),
            environment: PHOTO_ENVIRONMENT.FACADE,
            storageId: first.id,
          },
        ],
      })
      recordedSave(await repository.save(entity))

      entity.update({ title: 'Kitnet reformada', priceMonthly: 750 })
      entity.attachPhotos([
        {
          id: randomUUID(),
          environment: PHOTO_ENVIRONMENT.LIVING,
          storageId: second.id,
        },
      ])
      const saved = recordedSave(await repository.save(entity))

      const snapshot = saved.listing.snapshot()
      assert.equal(snapshot.title, 'Kitnet reformada')
      assert.equal(snapshot.priceMonthly, 750)
      assert.deepEqual(
        snapshot.photos.map((photo) => photo.storageId),
        [first.id, second.id],
      )
      assert.deepEqual(
        saved.files.map((each) => each.id),
        [first.id, second.id],
      )
    })

    test('when archiving and saving, the ad leaves every read', async ({
      assert,
    }) => {
      const {
        repository,
        neighborhood: createNeighborhood,
        account,
      } = await make()
      const centro = await createNeighborhood('centro', 'Centro')
      const entity = listingIn(LISTING_STATUS.PUBLISHED, {
        slug: 'saindo',
        neighborhoodId: centro,
        ownerId: await account(),
      })
      recordedSave(await repository.save(entity))

      entity.archive(ARCHIVED_AT)
      const saved = recordedSave(await repository.save(entity))

      // `save` answers with the row as written, trash included; every read after it hides the ad.
      assert.equal(saved.listing.snapshot().status, LISTING_STATUS.ARCHIVED)
      assert.instanceOf(saved.listing.snapshot().deletedAt, Date)
      assert.isNull(await repository.findById(entity.id))
      assert.isNull(await repository.findPublishedRecordBySlug('saindo'))
    })

    test('when the slug is taken by another ad, even a trashed one, save answers UNIQUE_CONFLICT and writes nothing', async ({
      assert,
    }) => {
      const {
        repository,
        neighborhood: createNeighborhood,
        account,
        seed,
      } = await make()
      const centro = await createNeighborhood('centro', 'Centro')
      const ownerId = await account()
      await seed(
        listingIn(
          LISTING_STATUS.ARCHIVED,
          { slug: 'ocupado', neighborhoodId: centro, ownerId },
          ARCHIVED_AT,
        ),
      )
      const entity = listingDraft({
        slug: 'ocupado',
        neighborhoodId: centro,
        ownerId,
      })

      const saved = await repository.save(entity)

      assert.deepEqual(saved.value, { code: 'UNIQUE_CONFLICT' })
      assert.isNull(await repository.findById(entity.id))
    })

    test('when the neighborhood does not exist, save answers a repository failure instead of throwing', async ({
      assert,
    }) => {
      const { repository, account } = await make()
      const entity = listingDraft({
        slug: 'sem-bairro',
        neighborhoodId: randomUUID(),
        ownerId: await account(),
      })

      const saved = await repository.save(entity)

      assert.containsSubset(saved.value, { code: 'REPOSITORY_FAILURE' })
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

/** The saved record, or the failure on the spot: a write the spec expects to succeed. */
function recordedSave<Fact, Stored>(result: Either<Fact, Stored>): Stored {
  if (result.isLeft())
    throw new Error(`save refused: ${JSON.stringify(result.value)}`)

  return result.value
}
