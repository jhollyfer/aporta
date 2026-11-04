import { test } from '@japa/runner'

import { UserFactory } from '#database/factories/user.factory'
import { resetDatabase } from '#tests/database-fixtures'
import { errorBody, page } from '#tests/response-fixtures'
import {
  authenticateAsAdministrator,
  authenticateAsModerator,
  authenticateAsOwner,
} from '#tests/session-fixtures'

/** A `string` and not the literal: the typed overload refuses the malformed filters sent on purpose. */
const URL: string = '/administrator/users'

/**
 * The accounts list. The contract asserted here: only the administrator reads it, the filters and
 * the search narrow together, and nothing secret is on the wire.
 */
test.group('administrator > users > paginate', (group) => {
  group.each.setup(() => resetDatabase())

  test('when the administrator lists, answers 200 with the allowlisted fields, the seeded administrator included', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    await UserFactory.merge({
      name: 'Ana Dona',
      email: 'ana@mail.com',
    }).create()

    const response = await client.get(URL).cookies(session)

    response.assertStatus(200)
    const { data, meta } = page(response)
    assert.equal(meta.total, 2)
    const ana = data.find((each) => each.email === 'ana@mail.com')
    assert.sameMembers(Object.keys(ana ?? {}), [
      'id',
      'name',
      'email',
      'role',
      'status',
      'verifiedAt',
      'createdAt',
      'updatedAt',
    ])
    assert.notInclude(JSON.stringify(response.body()), 'password')
  })

  test('when ?role, ?status and ?search are sent, each narrows and they narrow together', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    await UserFactory.merge({ name: 'Beto Equipe', email: 'beto@mail.com' })
      .apply('moderator')
      .create()
    await UserFactory.merge({ name: 'Carla Equipe', email: 'carla@mail.com' })
      .apply('moderator')
      .apply('inactive')
      .create()
    await UserFactory.merge({
      name: 'Dora Dona',
      email: 'dora@mail.com',
    }).create()

    const names = async (query: Record<string, string>) =>
      page(await client.get(URL).qs(query).cookies(session))
        .data.map((each) => each.name)
        .sort()

    assert.deepEqual(await names({ role: 'MODERATOR' }), [
      'Beto Equipe',
      'Carla Equipe',
    ])
    assert.deepEqual(await names({ status: 'INACTIVE' }), ['Carla Equipe'])
    assert.deepEqual(await names({ search: 'beto@' }), ['Beto Equipe'])
    assert.deepEqual(await names({ search: 'equipe', status: 'ACTIVE' }), [
      'Beto Equipe',
    ])
    assert.deepEqual(await names({ role: 'OWNER', search: 'equipe' }), [])
  })

  test('when sorted and paginated, follows the column, the direction and the page', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    await UserFactory.merge({ name: 'Zeca', email: 'zeca@mail.com' }).create()
    await UserFactory.merge({ name: 'Abel', email: 'abel@mail.com' }).create()

    const response = await client
      .get(URL)
      .qs({ sort: 'name', direction: 'asc', perPage: 1, page: 2 })
      .cookies(session)

    response.assertStatus(200)
    const { data, meta } = page(response)
    assert.equal(meta.total, 3)
    assert.lengthOf(data, 1)
    assert.isString(data[0]?.name)
  })

  test('when the filter is malformed, answers 422', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .get(URL)
      .qs({ role: 'ROOT', sort: 'password' })
      .cookies(session)

    response.assertStatus(422)
    assert.property(errorBody(response).errors, 'role')
    assert.property(errorBody(response).errors, 'sort')
  })

  test('when the caller is a moderator or an owner, answers 403; with no session, 401', async ({
    client,
    assert,
  }) => {
    const moderator = await authenticateAsModerator(client)
    const owner = await authenticateAsOwner(client)

    const asModerator = await client.get(URL).cookies(moderator)
    const asOwner = await client.get(URL).cookies(owner)
    const anonymous = await client.get(URL)

    asModerator.assertStatus(403)
    asOwner.assertStatus(403)
    anonymous.assertStatus(401)
    assert.equal(errorBody(asModerator).code, 'ACCESS_DENIED')
  })
})
