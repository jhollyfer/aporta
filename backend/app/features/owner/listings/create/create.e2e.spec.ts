import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import ListingModel from '#models/listing'
import { countRows, resetDatabase } from '#tests/database-fixtures'
import { body, errorBody, list, object } from '#tests/response-fixtures'
import {
  authenticateAsAdministrator,
  authenticateAsOwnerAccount,
} from '#tests/session-fixtures'
import { neighborhood } from '#tests/storefront-fixtures'

/**
 * A `string` and not the literal: the literal selects the typed overload of the client, whose
 * payload is the validator's output and refuses exactly what these cases send on purpose (a
 * `status` and an `ownerId` that must be dropped, a field missing).
 */
const URL: string = '/owner/listings'

const PAYLOAD = {
  type: 'KITNET',
  furnished: true,
  neighborhood: 'centro',
  address: 'Rua do Porto, 120',
  monthly: 900,
  water: true,
  electricity: true,
  internet: false,
  periods: ['SEMESTER'],
  minimumStayMonths: 4,
  title: 'Kitnet perto do porto',
  description: 'Kitnet mobiliada, com cama, geladeira e fogão.',
  rules: 'Sem festa\nSem animais',
  ownerName: 'Seu Raimundo',
  whatsapp: '5597999990001',
}

/**
 * The owner writing an ad through the real path: the validator pair, the neighborhood lookup, the
 * policy-free create and the row. The contract asserted here is that the ad is born `PENDING`
 * whatever the body says, that it belongs to the session account and to no one the body names,
 * and that it does not reach the storefront before the review.
 */
test.group('owner > listings > create', (group) => {
  group.each.setup(() => resetDatabase())

  test('when the payload is valid, answers 201 with the PENDING ad and the owner shape', async ({
    client,
    assert,
  }) => {
    await neighborhood({ slug: 'centro', name: 'Centro' })
    const { session } = await authenticateAsOwnerAccount(client)

    const response = await client.post(URL).cookies(session).json(PAYLOAD)

    response.assertStatus(201)
    const created = body(response)
    assert.equal(created.status, 'PENDING')
    assert.equal(created.title, PAYLOAD.title)
    assert.deepEqual(created.rules, ['Sem festa', 'Sem animais'])
    assert.deepEqual(created.photos, [])
    assert.match(String(created.slug), /^kitnet-perto-do-porto-[0-9a-f]{8}$/)
    assert.deepEqual(object(created.neighborhood), {
      slug: 'centro',
      name: 'Centro',
    })
    // The account and the trash stay in the database.
    assert.notProperty(created, 'ownerId')
    assert.notProperty(created, 'deletedAt')
  })

  test("when the body names a status and an owner, both are ignored: the ad is PENDING and the session's", async ({
    client,
    assert,
  }) => {
    await neighborhood({ slug: 'centro', name: 'Centro' })
    const { session, userId } = await authenticateAsOwnerAccount(client)

    const response = await client
      .post(URL)
      .cookies(session)
      .json({
        ...PAYLOAD,
        status: 'PUBLISHED',
        ownerId: '00000000-0000-4000-8000-000000000001',
      })

    response.assertStatus(201)
    const row = await ListingModel.findByOrFail('slug', body(response).slug)
    assert.equal(row.status, 'PENDING')
    assert.equal(row.ownerId, userId)
  })

  test('when the ad is created, the storefront does not show it before the review', async ({
    client,
  }) => {
    await neighborhood({ slug: 'centro', name: 'Centro' })
    const { session } = await authenticateAsOwnerAccount(client)
    const created = await client.post(URL).cookies(session).json(PAYLOAD)

    const bySlug = await client.get(
      `/storefront/listings/${String(body(created).slug)}`,
    )
    const listed = await client.get('/storefront/listings')

    bySlug.assertStatus(404)
    listed.assertStatus(200)
    // `list` reads `data`, which must be empty.
    const data = list(body(listed).data)
    if (data.length !== 0)
      throw new Error('a PENDING ad reached the storefront')
  })

  test('when two owners write the same title, the slugs differ', async ({
    client,
    assert,
  }) => {
    await neighborhood({ slug: 'centro', name: 'Centro' })
    const first = await authenticateAsOwnerAccount(client)
    const second = await authenticateAsOwnerAccount(client)

    const a = await client.post(URL).cookies(first.session).json(PAYLOAD)
    const b = await client.post(URL).cookies(second.session).json(PAYLOAD)

    a.assertStatus(201)
    b.assertStatus(201)
    assert.notEqual(body(a).slug, body(b).slug)
  })

  test('when the neighborhood does not exist, answers 422 on the field and writes nothing', async ({
    client,
    assert,
  }) => {
    await neighborhood({ slug: 'centro', name: 'Centro' })
    const { session } = await authenticateAsOwnerAccount(client)

    const response = await client
      .post(URL)
      .cookies(session)
      .json({ ...PAYLOAD, neighborhood: 'nenhum' })

    response.assertStatus(422)
    assert.equal(errorBody(response).code, 'NEIGHBORHOOD_NOT_FOUND')
    assert.property(errorBody(response).errors ?? {}, 'neighborhood')
    assert.equal(await countRows(db.from('listings').count('* as count')), 0)
  })

  test('when the payload breaks a rule, answers 422 pointing at each field', async ({
    client,
    assert,
  }) => {
    const { session } = await authenticateAsOwnerAccount(client)

    const response = await client
      .post(URL)
      .cookies(session)
      .json({ ...PAYLOAD, monthly: 900_000, periods: [], title: 'curto' })

    response.assertStatus(422)
    assert.sameMembers(Object.keys(errorBody(response).errors ?? {}), [
      'monthly',
      'periods',
      'title',
    ])
  })

  test('when a field is missing, answers 422 with the label in Portuguese', async ({
    client,
    assert,
  }) => {
    const { session } = await authenticateAsOwnerAccount(client)
    // `undefined` does not survive the JSON: the key is simply not sent.
    const response = await client
      .post(URL)
      .cookies(session)
      .json({ ...PAYLOAD, whatsapp: undefined })

    response.assertStatus(422)
    assert.equal(errorBody(response).errors?.whatsapp, 'Informe o WhatsApp')
  })

  test('when the rules text is empty, the ad is created without rules', async ({
    client,
    assert,
  }) => {
    await neighborhood({ slug: 'centro', name: 'Centro' })
    const { session } = await authenticateAsOwnerAccount(client)

    const response = await client
      .post(URL)
      .cookies(session)
      .json({ ...PAYLOAD, rules: '' })

    response.assertStatus(201)
    assert.deepEqual(body(response).rules, [])
  })

  test('when there is no session, answers 401', async ({ client }) => {
    const response = await client.post(URL).json(PAYLOAD)

    response.assertStatus(401)
  })

  test('when the actor is staff, answers 403 and writes nothing', async ({
    client,
    assert,
  }) => {
    await neighborhood({ slug: 'centro', name: 'Centro' })
    const session = await authenticateAsAdministrator(client)

    const response = await client.post(URL).cookies(session).json(PAYLOAD)

    response.assertStatus(403)
    assert.equal(await countRows(db.from('listings').count('* as count')), 0)
  })
})
