import { randomUUID } from 'node:crypto'

import app from '@adonisjs/core/services/app'
import {
  IMAGE_MIMETYPES,
  SORT_DIRECTION,
  STORAGE_MIMETYPE,
  TRASHED_MODE,
  UPLOAD_STATUS,
  USER_ROLE,
} from '@aporta/shared'
import { test } from '@japa/runner'

import { ListingPhotoFactory } from '#database/factories/listing-photo.factory'
import { UserFactory } from '#database/factories/user.factory'
import Storage, {
  type StorageCreateInput,
} from '#domain/storage/storage.entity'
import UserModel from '#models/user'
import StorageLucidRepository from '#repositories/storage/storage.lucid.repository'
import StorageMemoryRepository from '#repositories/storage/storage.memory.repository'
import {
  STORAGE_REFERENCE,
  type default as StorageRepository,
} from '#repositories/storage/storage.repository'
import { resetDatabase } from '#tests/database-fixtures'
import {
  ARCHIVED_AT,
  STORAGE_OWNER_ID,
  storageDraft,
} from '#tests/repository-fixtures'
import { listing } from '#tests/storefront-fixtures'

/**
 * The `StorageRepository` contract test (`_standards/domain.md` §5.4): the
 * same cases on Lucid, against Postgres, and in memory. Each implementation
 * says how another resource starts using the file: in Lucid, the owner
 * account with the avatar; in memory, the declared reference.
 */
type Subject = {
  repository: StorageRepository
  /** An account that exists for the implementation: files always have an owner. */
  ownerId: string
  /** Another account, to hand files over to. */
  otherOwnerId(): Promise<string>
  useAsAvatar(storageId: string): Promise<void>
  useAsListingPhoto(storageId: string): Promise<void>
}

const IMPLEMENTATIONS = {
  lucid: async () => {
    // `resetDatabase()` seeds the administrator, and `owner_id` is a foreign key to `users`.
    const owner = await UserModel.findByOrFail('role', USER_ROLE.ADMINISTRATOR)

    return {
      repository: await app.container.make(StorageLucidRepository),
      ownerId: owner.id,
      otherOwnerId: async () => (await UserFactory.create()).id,
      useAsAvatar: async (storageId: string) => {
        await UserModel.query()
          .where('id', owner.id)
          .update({ avatarId: storageId })
      },
      useAsListingPhoto: async (storageId: string) => {
        const ad = await listing()
        await ListingPhotoFactory.merge({
          listingId: ad.id,
          position: 0,
          storageId,
        }).create()
      },
    }
  },
  memory: async () => {
    const repository = await app.container.make(StorageMemoryRepository)
    return {
      repository,
      ownerId: STORAGE_OWNER_ID,
      otherOwnerId: () => Promise.resolve(randomUUID()),
      useAsAvatar: (storageId: string) =>
        Promise.resolve(
          repository.reference(storageId, STORAGE_REFERENCE.USER_AVATAR),
        ),
      useAsListingPhoto: (storageId: string) =>
        Promise.resolve(
          repository.reference(storageId, STORAGE_REFERENCE.LISTING_PHOTO),
        ),
    }
  },
} satisfies Record<string, () => Promise<Subject>>

/** The kinds a listing photo may be. */
const IMAGES = IMAGE_MIMETYPES

const PAGE = {
  page: 1,
  perPage: 20,
  sort: 'originalName',
  direction: SORT_DIRECTION.ASC,
} as const

/** The draft file of the given owner. */
function draftFor(ownerId: string) {
  return (input: Partial<StorageCreateInput> = {}): Storage =>
    storageDraft({ ownerId, ...input })
}

for (const [name, make] of Object.entries(IMPLEMENTATIONS)) {
  test.group(`StorageRepository (${name})`, (group) => {
    group.each.setup(() => resetDatabase())

    test('when saving a new one, it returns it as it ended up: PENDING and stamped', async ({
      assert,
    }) => {
      const { ownerId, repository } = await make()
      const draft = draftFor(ownerId)
      const storage = draft({ uploadId: 'multi', size: 2048 })

      const saved = await repository.save(storage)
      const snapshot = saved.storage.snapshot()

      assert.equal(snapshot.status, UPLOAD_STATUS.PENDING)
      assert.equal(snapshot.size, 2048)
      assert.equal(snapshot.uploadId, 'multi')
      assert.instanceOf(saved.createdAt, Date)
      const found = await repository.findById(storage.id)
      assert.deepEqual(found?.snapshot(), snapshot)
    })

    test('when confirming, the next read sees UPLOADED without uploadId', async ({
      assert,
    }) => {
      const { ownerId, repository } = await make()
      const draft = draftFor(ownerId)
      const storage = draft({ uploadId: 'multi', size: 5 })
      await repository.save(storage)

      storage.confirm(5)
      await repository.save(storage)

      const record = await repository.findRecord(storage.id)
      assert.equal(record?.storage.snapshot().status, UPLOAD_STATUS.UPLOADED)
      assert.isNull(record?.storage.snapshot().uploadId)
    })

    test('when cancelled, only findById with trashed finds it', async ({
      assert,
    }) => {
      const { ownerId, repository } = await make()
      const draft = draftFor(ownerId)
      const storage = draft()
      storage.cancel(ARCHIVED_AT)
      await repository.save(storage)

      assert.isNull(await repository.findById(storage.id))
      assert.isNull(await repository.findRecord(storage.id))
      assert.isNotNull(await repository.findById(storage.id, TRASHED_MODE.WITH))
      assert.isNull(await repository.findById(randomUUID(), TRASHED_MODE.WITH))
    })

    test('when another resource uses the file, references says where; an orphan is empty', async ({
      assert,
    }) => {
      const { ownerId, repository, useAsAvatar, useAsListingPhoto } =
        await make()
      const draft = draftFor(ownerId)
      const used = draft({ size: 1 })
      used.confirm(1)
      const photo = draft({ size: 1 })
      photo.confirm(1)
      const orphan = draft()
      await repository.save(used)
      await repository.save(photo)
      await repository.save(orphan)
      await useAsAvatar(used.id)
      await useAsListingPhoto(photo.id)

      assert.deepEqual(await repository.references(used.id), [
        STORAGE_REFERENCE.USER_AVATAR,
      ])
      // A listing photo counts as use: deleting the file would take the picture off the ad.
      assert.deepEqual(await repository.references(photo.id), [
        STORAGE_REFERENCE.LISTING_PHOTO,
      ])
      assert.deepEqual(await repository.references(orphan.id), [])
    })

    test('when paginating, it filters by status, type and search, without the cancelled', async ({
      assert,
    }) => {
      const { ownerId, repository } = await make()
      const draft = draftFor(ownerId)
      const done = draft({ originalName: 'capa.png', size: 1 })
      done.confirm(1)
      await repository.save(done)
      await repository.save(
        draft({
          originalName: 'manual.pdf',
          mimetype: STORAGE_MIMETYPE.PDF,
        }),
      )
      const cancelled = draft({ originalName: 'abandonado.png' })
      cancelled.cancel(ARCHIVED_AT)
      await repository.save(cancelled)

      const names = async (criteria: object) => {
        const page = await repository.paginate({ ...PAGE, ...criteria })
        return page.data.map((item) => item.storage.snapshot().originalName)
      }

      assert.deepEqual(await names({}), ['capa.png', 'manual.pdf'])
      assert.deepEqual(await names({ status: UPLOAD_STATUS.UPLOADED }), [
        'capa.png',
      ])
      assert.deepEqual(await names({ mimetype: STORAGE_MIMETYPE.PDF }), [
        'manual.pdf',
      ])
      assert.deepEqual(await names({ search: 'PDF' }), ['manual.pdf'])
    })

    test('when deleting, no read finds it anymore', async ({ assert }) => {
      const { ownerId, repository } = await make()
      const draft = draftFor(ownerId)
      const storage = draft()
      await repository.save(storage)

      await repository.delete(storage)

      assert.isNull(await repository.findById(storage.id, TRASHED_MODE.WITH))
    })

    test('when every id is a living UPLOADED file, allUploaded is true; PENDING, trashed or unknown ids make it false', async ({
      assert,
    }) => {
      const { ownerId, repository } = await make()
      const draft = draftFor(ownerId)
      const live = draft({ size: 5 })
      live.confirm(5)
      const pending = draft()
      const trashed = Storage.restore({
        ...draft().snapshot(),
        status: UPLOAD_STATUS.UPLOADED,
        deletedAt: ARCHIVED_AT,
      })
      for (const storage of [live, pending, trashed])
        await repository.save(storage)

      assert.isTrue(await repository.allUploaded([]))
      assert.isTrue(await repository.allUploaded([live.id, live.id]))
      assert.isFalse(await repository.allUploaded([live.id, pending.id]))
      assert.isFalse(await repository.allUploaded([trashed.id]))
      assert.isFalse(await repository.allUploaded([randomUUID()]))
    })

    test('when asking for the files of one account, allUploadedBy only accepts live UPLOADED files that account sent', async ({
      assert,
    }) => {
      const { ownerId, otherOwnerId, repository } = await make()
      const other = await otherOwnerId()
      const mine = draftFor(ownerId)({ size: 5 })
      mine.confirm(5)
      const theirs = draftFor(other)({ size: 5 })
      theirs.confirm(5)
      const pending = draftFor(ownerId)()
      for (const storage of [mine, theirs, pending])
        await repository.save(storage)

      assert.isTrue(await repository.allUploadedBy([], ownerId, IMAGES))
      assert.isTrue(
        await repository.allUploadedBy([mine.id, mine.id], ownerId, IMAGES),
      )
      // Someone else's file is indistinguishable from one that does not exist.
      assert.isFalse(
        await repository.allUploadedBy([theirs.id], ownerId, IMAGES),
      )
      assert.isFalse(
        await repository.allUploadedBy([mine.id, theirs.id], ownerId, IMAGES),
      )
      assert.isFalse(
        await repository.allUploadedBy([pending.id], ownerId, IMAGES),
      )
      assert.isFalse(
        await repository.allUploadedBy([randomUUID()], ownerId, IMAGES),
      )
    })

    test("when asking for images only, allUploadedBy refuses the account's own file of another kind", async ({
      assert,
    }) => {
      const { ownerId, repository } = await make()
      const manual = draftFor(ownerId)({
        mimetype: STORAGE_MIMETYPE.PDF,
        size: 5,
      })
      manual.confirm(5)
      await repository.save(manual)

      assert.isFalse(
        await repository.allUploadedBy([manual.id], ownerId, IMAGES),
      )
      assert.isTrue(
        await repository.allUploadedBy([manual.id], ownerId, [
          STORAGE_MIMETYPE.PDF,
        ]),
      )
    })

    test('when paginating for one account, only its files come back', async ({
      assert,
    }) => {
      const { ownerId, otherOwnerId, repository } = await make()
      const other = await otherOwnerId()
      await repository.save(draftFor(ownerId)({ originalName: 'minha.png' }))
      await repository.save(draftFor(other)({ originalName: 'alheia.png' }))

      const names = async (criteria: object) => {
        const page = await repository.paginate({ ...PAGE, ...criteria })
        return page.data.map((item) => item.storage.snapshot().originalName)
      }

      assert.deepEqual(await names({ ownerId }), ['minha.png'])
      assert.deepEqual(await names({}), ['alheia.png', 'minha.png'])
    })

    test('when listing abandoned uploads, returns only the PENDING ones created before the cutoff', async ({
      assert,
    }) => {
      const { ownerId, repository } = await make()
      const draft = draftFor(ownerId)
      const pending = draft()
      const done = draft({ size: 5 })
      done.confirm(5)
      await repository.save(pending)
      await repository.save(done)

      const later = new Date(Date.now() + 60_000)
      const abandoned = await repository.findAbandoned(later)

      assert.deepEqual(
        abandoned.map((record) => record.storage.id),
        [pending.id],
      )
      assert.lengthOf(await repository.findAbandoned(new Date(0)), 0)
    })

    test('when transferring ownership, every file of the old owner passes to the new one and the others stay', async ({
      assert,
    }) => {
      const { ownerId, otherOwnerId, repository } = await make()
      const bystander = await otherOwnerId()
      const heir = await otherOwnerId()
      const mine = draftFor(ownerId)()
      const theirs = draftFor(bystander)()
      await repository.save(mine)
      await repository.save(theirs)

      await repository.transferOwnership(ownerId, heir)

      const moved = await repository.findById(mine.id)
      const kept = await repository.findById(theirs.id)
      assert.equal(moved?.snapshot().ownerId, heir)
      assert.equal(kept?.snapshot().ownerId, bystander)
    })
  })
}
