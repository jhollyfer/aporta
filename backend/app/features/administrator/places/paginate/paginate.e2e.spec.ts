import { PLACE_CATEGORY } from '@aporta/shared'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { resetDatabase } from '#tests/database-fixtures'
import { errorBody, page } from '#tests/response-fixtures'
import {
  authenticateAsAdministrator,
  authenticateAsModerator,
  authenticateAsOwner,
} from '#tests/session-fixtures'
import { neighborhood, place, placeOf } from '#tests/storefront-fixtures'

/** A `string` and not the literal: the typed overload refuses the malformed filters sent on purpose. */
const URL: string = '/administrator/places'

/**
 * The staff's list of the guide. The contract asserted here: the live ones by name, the trash
 * reachable only on purpose (`?trashed`), the tab and the search narrowing together, and the door
 * shut to the owner and to the anonymous.
 */
test.group('administrator > places > paginate', (group) => {
  group.each.setup(() => resetDatabase())

  test('when the moderator lists, answers 200 with the live places by name and the archive date empty', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood({ slug: 'centro', name: 'Centro' })
    const session = await authenticateAsModerator(client)
    await place({ name: 'Tacacá', neighborhoodId: centro.id })
    await place({ name: 'Peixaria', neighborhoodId: centro.id })
    await place({
      name: 'Arquivada',
      neighborhoodId: centro.id,
      deletedAt: DateTime.now(),
    })

    const response = await client.get(URL).cookies(session)

    response.assertStatus(200)
    const { data, meta } = page(response)
    assert.deepEqual(
      data.map((each) => each.name),
      ['Peixaria', 'Tacacá'],
    )
    assert.equal(meta.total, 2)
    assert.containsSubset(data[0], {
      archivedAt: null,
      neighborhood: { slug: 'centro', name: 'Centro' },
    })
    assert.notProperty(data[0] ?? {}, 'deletedAt')
    assert.notProperty(data[0] ?? {}, 'neighborhoodId')
  })

  test('when ?trashed=only is sent, answers only the archived ones with when they left; ?trashed=with answers both', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    await place({ name: 'Viva' })
    await place({ name: 'Arquivada', deletedAt: DateTime.now() })

    const only = await client.get(URL).qs({ trashed: 'only' }).cookies(session)
    const both = await client.get(URL).qs({ trashed: 'with' }).cookies(session)

    only.assertStatus(200)
    assert.deepEqual(
      page(only).data.map((each) => each.name),
      ['Arquivada'],
    )
    assert.isString(page(only).data[0]?.archivedAt)
    assert.deepEqual(
      page(both).data.map((each) => each.name),
      ['Arquivada', 'Viva'],
    )
  })

  test('when ?category and ?search are sent together, the search does not escape the tab', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    await placeOf(PLACE_CATEGORY.DRINK, {
      name: 'Bar do Beiradão',
      description: 'Cerveja com peixe frito.',
    })
    await place({ name: 'Peixaria', description: 'Peixe na brasa.' })

    const response = await client
      .get(URL)
      .qs({ category: 'DRINK', search: 'peixe' })
      .cookies(session)

    response.assertStatus(200)
    assert.deepEqual(
      page(response).data.map((each) => each.name),
      ['Bar do Beiradão'],
    )
  })

  test('when a filter is outside the closed list, answers 422 pointing at each field', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const response = await client
      .get(`${URL}?category=PARTY&trashed=ONLY&sort=whatsapp`)
      .cookies(session)

    response.assertStatus(422)
    assert.sameMembers(Object.keys(errorBody(response).errors ?? {}), [
      'category',
      'trashed',
      'sort',
    ])
  })

  test('when the caller is an owner, answers 403; with no session, 401', async ({
    client,
  }) => {
    const owner = await authenticateAsOwner(client)

    const forbidden = await client.get(URL).cookies(owner)
    const anonymous = await client.get(URL)

    forbidden.assertStatus(403)
    anonymous.assertStatus(401)
  })
})
