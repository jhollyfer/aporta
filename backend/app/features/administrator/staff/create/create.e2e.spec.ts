import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import { USER_ROLE } from '@aporta/shared'
import { test } from '@japa/runner'

import StaffCreate from '../../../../../commands/staff-create.command.ts'

import { UserFactory } from '#database/factories/user.factory'
import UserModel from '#models/user'
import { countRows, resetDatabase } from '#tests/database-fixtures'
import { authenticate } from '#tests/session-fixtures'

const PASSWORD = 'Demo1234!'

/**
 * The first administrator in production (`node ace staff:create`).
 *
 * It lives in this spec because the command is a caller of the use-case: next to the command it
 * would not run - Ace loads every file in `commands/` as a command, and a `test.group` outside
 * the runner brings down the boot (the same reason `storages:prune` is tested in its use-case's
 * folder). What is asserted is what the operator relies on: the account can sign in with the
 * password it was given, the password is never printed, and a taken email is refused.
 */
test.group('administrator > staff > create > command', (group) => {
  group.each.setup(() => resetDatabase())

  async function execute(
    prepare: (ace: Awaited<ReturnType<typeof makeAce>>) => void,
    args: Array<string>,
  ) {
    const ace = await makeAce()
    prepare(ace)
    const command = await ace.create(StaffCreate, args)

    await command.exec()

    return { command, ace }
  }

  async function makeAce() {
    const ace = await app.container.make('ace')
    ace.ui.switchMode('raw')

    return ace
  }

  /** The password has no flag and no variable: every run types it in the hidden prompt, twice. */
  function run(password: string, ...args: Array<string>) {
    return execute((ace) => {
      ace.prompt.trap('Password').replyWith(password)
      ace.prompt.trap('Repeat the password').replyWith(password)
    }, args)
  }

  function logs(ace: Awaited<ReturnType<typeof run>>['ace']): string {
    return ace.ui.logger
      .getLogs()
      .map((entry) => entry.message)
      .join('\n')
  }

  test('when the flags are given and the password is typed, it creates an ADMINISTRATOR that signs in, and never prints the password', async ({
    client,
    assert,
  }) => {
    const { command, ace } = await run(
      PASSWORD,
      '--email=maria@aporta.com.br',
      '--name=Maria da Equipe',
    )

    command.assertSucceeded()
    const row = await UserModel.findByOrFail('email', 'maria@aporta.com.br')
    assert.equal(row.role, USER_ROLE.ADMINISTRATOR)
    assert.notInclude(logs(ace), PASSWORD)
    // The real door: if the hash were wrong, this would be a 401.
    await authenticate(client, 'maria@aporta.com.br', PASSWORD)
  })

  test('when --role=MODERATOR is given, the account is a moderator', async ({
    assert,
  }) => {
    const { command } = await run(
      PASSWORD,
      '--email=ana@aporta.com.br',
      '--name=Ana',
      '--role=moderator',
    )

    command.assertSucceeded()
    const row = await UserModel.findByOrFail('email', 'ana@aporta.com.br')
    assert.equal(row.role, USER_ROLE.MODERATOR)
  })

  test('when the role is not a staff role, it refuses and creates nothing', async ({
    assert,
  }) => {
    // The role is refused before any prompt, so no prompt is trapped.
    const { command } = await execute(
      () => undefined,
      ['--email=dono@aporta.com.br', '--name=Dono', '--role=OWNER'],
    )

    command.assertFailed()
    assert.equal(
      await countRows(
        db
          .from('users')
          .where('email', 'dono@aporta.com.br')
          .count('* as count'),
      ),
      0,
    )
  })

  test('when the password breaks the policy, it refuses, says which rule and does not echo the value', async ({
    assert,
  }) => {
    const { command, ace } = await run(
      'weakpass',
      '--email=fraca@aporta.com.br',
      '--name=Fraca',
    )

    command.assertFailed()
    assert.include(logs(ace), 'password')
    assert.notInclude(logs(ace), 'weakpass')
    assert.isNull(await UserModel.findBy('email', 'fraca@aporta.com.br'))
  })

  test('when the email already exists, it refuses and leaves the account untouched', async ({
    assert,
  }) => {
    const existing = await UserFactory.merge({
      email: 'maria@aporta.com.br',
    }).create()
    const { command } = await run(
      PASSWORD,
      '--email=maria@aporta.com.br',
      '--name=Outra Maria',
    )

    command.assertFailed()
    const row = await UserModel.findOrFail(existing.id)
    assert.notEqual(row.role, USER_ROLE.ADMINISTRATOR)
  })

  test('when nothing is given, it asks for the email, the name and the password twice', async ({
    assert,
  }) => {
    const ace = await app.container.make('ace')
    ace.ui.switchMode('raw')
    ace.prompt
      .trap('Email of the new account')
      .replyWith('prompt@aporta.com.br')
    ace.prompt.trap('Name of the new account').replyWith('Pela Pergunta')
    ace.prompt.trap('Password').replyWith(PASSWORD)
    ace.prompt.trap('Repeat the password').replyWith(PASSWORD)

    const command = await ace.create(StaffCreate, [])
    await command.exec()

    command.assertSucceeded()
    assert.isNotNull(await UserModel.findBy('email', 'prompt@aporta.com.br'))
  })

  test('when the two typed passwords differ, it refuses and creates nothing', async ({
    assert,
  }) => {
    const ace = await app.container.make('ace')
    ace.ui.switchMode('raw')
    ace.prompt.trap('Password').replyWith(PASSWORD)
    ace.prompt.trap('Repeat the password').replyWith('Other1234!')

    const command = await ace.create(StaffCreate, [
      '--email=typo@aporta.com.br',
      '--name=Typo',
    ])
    await command.exec()

    command.assertFailed()
    assert.isNull(await UserModel.findBy('email', 'typo@aporta.com.br'))
  })
})
