import app from '@adonisjs/core/services/app'
import drive from '@adonisjs/drive/services/main'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import StoragesPrune from '#commands/storages-prune.command'
import Storage from '#models/storage'
import MultipartContract, {
  PART_SIZE,
} from '#services/multipart/multipart.contract'
import { resetDatabase } from '#tests/database-fixtures'
import { errorBody, present } from '#tests/response-fixtures'
import { authenticateAsAdministrator } from '#tests/session-fixtures'
import { FULL_PART, SMALL, open, put, upload } from '#tests/storage-fixtures'

/**
 * The file as a neutral, shared record: it does not belong to the
 * form that sent it, and ownership authorizes nothing. What rules is the state
 * (`PENDING` or `UPLOADED`) and the live reference.
 */

test.group('storage > files > delete', (group) => {
  group.each.setup(() => resetDatabase())

  test('when the file is an orphan, deletes it and the binary leaves the bucket along with it', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const storage = await upload(client, session)

    // The binary exists beforehand: without this assertion, a `delete` that deleted
    // nothing would pass the one below by vacuity.
    assert.isTrue(await drive.use().exists(storage.path))

    const response = await client
      .delete(`/storages/${storage.id}`)
      .cookies(session)

    response.assertStatus(204)

    assert.isNull(await Storage.find(storage.id))
    assert.isFalse(await drive.use().exists(storage.path))
  })

  test('when an upload is in progress, cancels it and discards the parts', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const opened = await open(client, session, {
      fileName: 'galeria.png',
      mimetype: 'image/png',
      size: PART_SIZE * 2,
    })

    await put(present(opened.parts[0], 'part 1').url, FULL_PART)

    const response = await client
      .delete(`/storages/${opened.storage.id}`)
      .cookies(session)

    response.assertStatus(204)

    const cancelled = await Storage.find(opened.storage.id)
    assert.isNotNull(cancelled?.deletedAt)

    // The upload ceased to exist: asking to resume it now is 404.
    const resumed = await client
      .get(`/storages/${opened.storage.id}/parts`)
      .cookies(session)
    resumed.assertStatus(404)
  })

  test('when the same upload is cancelled twice, answers 204 both times', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const opened = await open(client, session, {
      fileName: 'capa.png',
      mimetype: 'image/png',
      size: SMALL.byteLength,
    })

    const first = await client
      .delete(`/storages/${opened.storage.id}`)
      .cookies(session)
    first.assertStatus(204)

    // The client repeats the `DELETE` when the first response is lost on the network.
    const second = await client
      .delete(`/storages/${opened.storage.id}`)
      .cookies(session)
    second.assertStatus(204)

    const cancelled = await Storage.find(opened.storage.id)
    assert.isNotNull(cancelled?.deletedAt)
  })

  test('when the file is in use as an avatar, refuses with 409', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const storage = await upload(client, session)

    const linked = await client
      .put('/account')
      .cookies(session)
      .json({ avatarId: storage.id })
    linked.assertStatus(200)

    const response = await client
      .delete(`/storages/${storage.id}`)
      .cookies(session)

    response.assertStatus(409)
    assert.equal(errorBody(response).code, 'STORAGE_IN_USE')

    // The 409 cannot be a "deleted and complained": record and binary are still there.
    assert.isNotNull(await Storage.find(storage.id))
    assert.isTrue(await drive.use().exists(storage.path))
  })

  const IN_USE_LABEL = [
    { header: 'pt-BR', label: 'avatar de usuário' },
    { header: 'en', label: 'user avatar' },
    { header: 'es', label: 'avatar de usuario' },
  ] as const

  for (const { header, label } of IN_USE_LABEL) {
    test(`when the language is ${header}, it names where the file is in use`, async ({
      client,
      assert,
    }) => {
      const session = await authenticateAsAdministrator(client)
      const storage = await upload(client, session)

      await client
        .put('/account')
        .cookies(session)
        .json({ avatarId: storage.id })

      const response = await client
        .delete(`/storages/${storage.id}`)
        .header('Accept-Language', header)
        .cookies(session)

      response.assertStatus(409)
      assert.include(
        present(errorBody(response).errors?.['id'], 'the id error'),
        label,
      )
    })
  }

  test('when the attachment is unlinked, goes back to accepting', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const storage = await upload(client, session)

    await client.put('/account').cookies(session).json({ avatarId: storage.id })
    await client.put('/account').cookies(session).json({ avatarId: null })

    const response = await client
      .delete(`/storages/${storage.id}`)
      .cookies(session)

    response.assertStatus(204)
    assert.isNull(await Storage.find(storage.id))
  })

  test('when the id does not exist, answers 404', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .delete('/storages/00000000-0000-4000-8000-000000000000')
      .cookies(session)

    response.assertStatus(404)
    assert.equal(errorBody(response).code, 'STORAGE_NOT_FOUND')
  })

  test('when there is no session, requires one', async ({ client }) => {
    const response = await client.delete(
      '/storages/00000000-0000-4000-8000-000000000000',
    )

    response.assertStatus(401)
  })
})

/**
 * The sweep of abandoned `PENDING` (`node ace storages:prune`).
 *
 * It lives in the `delete` spec because the command is a caller of it: deleting a
 * `PENDING` is what `StorageFileDeleteUseCase` already does, and the command only chooses
 * which ones. Next to the command it would not run - Ace loads every file in
 * `commands/` as a command, and a `test.group` outside the runner brings down the boot.
 *
 * `PENDING` is the only state from which one does not leave on one's own: whoever closes the tab in the
 * middle of the upload never calls `complete` or `DELETE`, and the row stays up
 * with the parts dangling in the bucket, invisible in the object listing and
 * billed anyway. The command is what closes the state machine.
 */
test.group('storage > files > delete > prune', (group) => {
  group.each.setup(() => resetDatabase())

  /** Ages the row in the database: it is the age the command uses to decide. */
  async function age(id: string, hours: number): Promise<void> {
    await Storage.query()
      .where('id', id)
      .update({ created_at: DateTime.now().minus({ hours }).toSQL() })
  }

  async function prune(...args: Array<string>) {
    const ace = await app.container.make('ace')
    const command = await ace.create(StoragesPrune, args)

    await command.exec()

    return command
  }

  test('when the PENDING is old, deletes it and aborts its multipart', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const multipart = await app.container.make(MultipartContract)

    const opened = await open(client, session, {
      fileName: 'galeria.png',
      mimetype: 'image/png',
      size: PART_SIZE + SMALL.byteLength,
    })

    // One part goes up and the other does not: it is abandonment midway, and these
    // orphan parts are what only the abort reaches.
    await put(present(opened.parts[0], 'part 1').url, FULL_PART)
    await age(opened.storage.id, 48)

    const command = await prune()

    command.assertSucceeded()

    assert.isNull(await Storage.find(opened.storage.id))
    // Listing the parts of an aborted upload is an error, not an empty list - it is the
    // difference between "aborted" and "open with no part at all".
    const listed = await multipart.listParts(
      opened.storage.path,
      present(opened.uploadId, 'the uploadId'),
    )

    assert.isTrue(listed.isLeft())
  })

  test('when the PENDING is recent, does not touch it', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const opened = await open(client, session, {
      fileName: 'capa.png',
      mimetype: 'image/png',
      size: SMALL.byteLength,
    })

    const command = await prune()

    command.assertSucceeded()

    assert.isNotNull(await Storage.find(opened.storage.id))
  })

  test('when the file is UPLOADED, does not touch it however old it is', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const storage = await upload(client, session)

    await age(storage.id, 24 * 365)

    const command = await prune()

    command.assertSucceeded()

    assert.isNotNull(await Storage.find(storage.id))
    assert.isTrue(await drive.use().exists(storage.path))
  })

  test('when --hours is passed, adjusts the cutoff', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const opened = await open(client, session, {
      fileName: 'capa.png',
      mimetype: 'image/png',
      size: SMALL.byteLength,
    })

    await age(opened.storage.id, 2)

    // Survives the 24h default and does not survive a one-hour cutoff.
    await prune()
    assert.isNotNull(await Storage.find(opened.storage.id))

    await prune('--hours=1')
    assert.isNull(await Storage.find(opened.storage.id))
  })

  test('when --dry-run is passed, lists without deleting', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const opened = await open(client, session, {
      fileName: 'capa.png',
      mimetype: 'image/png',
      size: SMALL.byteLength,
    })

    await age(opened.storage.id, 48)

    const command = await prune('--dry-run')

    command.assertSucceeded()

    assert.isNotNull(await Storage.find(opened.storage.id))
  })

  test('when a stored name has control characters, the dry run prints it without them', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const opened = await open(client, session, {
      fileName: 'capa.png',
      mimetype: 'image/png',
      size: SMALL.byteLength,
    })

    // A row from before the validator refused control characters: the ESC sequence
    // clears the screen, the CR rewrites the line, and the BEL beeps.
    await Storage.query()
      .where('id', opened.storage.id)
      .update({ original_name: 'a\u001b[2Jb\rc\u0007d\u009be.png' })
    await age(opened.storage.id, 48)

    const ace = await app.container.make('ace')
    ace.ui.switchMode('raw')
    const command = await ace.create(StoragesPrune, ['--dry-run'])
    await command.exec()

    const printed = command.logger
      .getLogs()
      .map((log) => log.message)
      .join(' ')

    assert.include(printed, opened.storage.id)
    assert.include(printed, 'ab?c?d?e.png')
    assert.notMatch(printed, /\p{Cc}/u)
  })
})
