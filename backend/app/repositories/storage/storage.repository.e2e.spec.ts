import { randomUUID } from 'node:crypto'

import app from '@adonisjs/core/services/app'
import {
  SORT_DIRECTION,
  STORAGE_MIMETYPE,
  TRASHED_MODE,
  UPLOAD_STATUS,
  USER_ROLE,
} from '@aporta/shared'
import { test } from '@japa/runner'

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
    }
  },
} satisfies Record<string, () => Promise<Subject>>

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
      const { ownerId, repository, useAsAvatar } = await make()
      const draft = draftFor(ownerId)
      const used = draft({ size: 1 })
      used.confirm(1)
      const orphan = draft()
      await repository.save(used)
      await repository.save(orphan)
      await useAsAvatar(used.id)

      assert.deepEqual(await repository.references(used.id), [
        STORAGE_REFERENCE.USER_AVATAR,
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
