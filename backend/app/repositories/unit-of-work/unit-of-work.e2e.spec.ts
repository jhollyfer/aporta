import app from '@adonisjs/core/services/app'
import { USER_ROLE, left, right } from '@aporta/shared'
import { test } from '@japa/runner'

import { UserFactory } from '#database/factories/user.factory'
import UserModel from '#models/user'
import StorageRepository from '#repositories/storage/storage.repository'
import UnitOfWork from '#repositories/unit-of-work/unit-of-work'
import { resetDatabase } from '#tests/database-fixtures'
import { storageDraft } from '#tests/repository-fixtures'

/**
 * The `UnitOfWork` against Postgres (`_standards/domain.md` §6): a `right` commits what the
 * repositories wrote, and a `left` or an exception undoes all of it. The memory
 * implementation only runs `work`, so the rollback can only be proven here.
 */
async function scenario() {
  const files = await app.container.make(StorageRepository)
  const unitOfWork = await app.container.make(UnitOfWork)
  const owner = (await UserModel.findByOrFail('role', USER_ROLE.ADMINISTRATOR))
    .id
  const heir = (await UserFactory.create()).id
  const file = storageDraft({ ownerId: owner })
  await files.save(file)

  return { files, unitOfWork, owner, heir, file }
}

test.group('UnitOfWork (lucid)', (group) => {
  group.each.setup(() => resetDatabase())

  test('when work answers right, it commits the writes', async ({ assert }) => {
    const { files, unitOfWork, owner, heir, file } = await scenario()

    const result = await unitOfWork.run(async () => {
      await files.transferOwnership(owner, heir)
      return right<never, string>('done')
    })

    assert.isTrue(result.isRight())
    assert.equal((await files.findById(file.id))?.snapshot().ownerId, heir)
  })

  test('when work answers left, it rolls the writes back and returns the left', async ({
    assert,
  }) => {
    const { files, unitOfWork, owner, heir, file } = await scenario()

    const result = await unitOfWork.run(async () => {
      await files.transferOwnership(owner, heir)
      return left<string, never>('refused')
    })

    assert.isTrue(result.isLeft())
    assert.equal(result.value, 'refused')
    assert.equal((await files.findById(file.id))?.snapshot().ownerId, owner)
  })

  test('when work fails after a write, it rolls back and the exception leaves', async ({
    assert,
  }) => {
    const { files, unitOfWork, owner, heir, file } = await scenario()

    await assert.rejects(
      () =>
        unitOfWork.run(async () => {
          await files.transferOwnership(owner, heir)
          return Promise.reject(new Error('connection lost'))
        }),
      'connection lost',
    )

    assert.equal((await files.findById(file.id))?.snapshot().ownerId, owner)
  })

  test('when the work is over, the next read no longer sees the transaction', async ({
    assert,
  }) => {
    const { files, unitOfWork, owner, heir, file } = await scenario()
    await unitOfWork.run(async () => {
      await files.transferOwnership(owner, heir)
      return left<string, never>('refused')
    })

    await files.transferOwnership(owner, heir)

    assert.equal((await files.findById(file.id))?.snapshot().ownerId, heir)
  })
})
