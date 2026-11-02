import { UPLOAD_STATUS } from '@aporta/shared'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { resetDatabase, storageRecord } from '#tests/database-fixtures'
import { errorBody, page } from '#tests/response-fixtures'
import { authenticateAsAdministrator } from '#tests/session-fixtures'

/**
 * The file is a neutral record: it does not belong to the form that uses it. Who may reach it
 * is `StoragePolicy` (the staff, or the account that uploaded it), and what rules the rest is
 * the state (`PENDING` or `UPLOADED`) and the live reference.
 */

/**
 * The panel file library: `GET /storages` and `GET /storages/:id`.
 *
 * What is asserted here is what the
 * query does before paginating - the default order, the two filters and the search
 * scope - and that the detail also reaches the half-finished upload.
 */
test.group('storage > files > paginate', (group) => {
  group.each.setup(() => resetDatabase())

  test('when no order is given, the default order is from newest to oldest', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const older = await storageRecord({ originalName: 'antigo.png' })
    const recent = await storageRecord({ originalName: 'recente.png' })

    // `createdAt` comes from `autoCreate` and the two rows are born in the same
    // millisecond: without spacing them apart, the order would be the database's and the test would pass
    // with any `orderBy`.
    await older.merge({ createdAt: DateTime.now().minus({ days: 2 }) }).save()

    const response = await client.get('/storages').cookies(session)

    response.assertStatus(200)
    assert.deepEqual(
      page(response).data.map((item) => item.id),
      [recent.id, older.id],
    )
    // Page 1 with 20 items is the default of every panel resource.
    assert.equal(page(response).meta.currentPage, 1)
    assert.equal(page(response).meta.perPage, 20)
  })

  test('when ?status is sent, narrows the open upload', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    await storageRecord()
    const pending = await storageRecord({ status: UPLOAD_STATUS.PENDING })

    const response = await client
      .get('/storages')
      .qs({ status: 'PENDING' })
      .cookies(session)

    response.assertStatus(200)
    assert.lengthOf(page(response).data, 1)
    assert.equal(page(response).data[0]?.id, pending.id)
  })

  test('when ?mimetype is sent, narrows a single type', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    await storageRecord()
    const pdf = await storageRecord({ mimetype: 'application/pdf' })

    const response = await client
      .get('/storages')
      .qs({ mimetype: 'application/pdf' })
      .cookies(session)

    response.assertStatus(200)
    assert.lengthOf(page(response).data, 1)
    assert.equal(page(response).data[0]?.id, pdf.id)
  })

  test('when ?search is sent, does not escape the status filter', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    const confirmed = await storageRecord({ originalName: 'contrato.pdf' })
    // It matches the search by **mimetype**, not by original name, and is
    // `PENDING`: with a loose `OR` it would show up even with `?status=UPLOADED`,
    // because the `OR` cancels the previous `AND`. The term has to land in a column
    // after the first, otherwise the grouped `OR` and the loose one answer the same and the
    // test measures nothing.
    await storageRecord({
      originalName: 'sem-o-termo-no-nome.png',
      mimetype: 'application/pdf',
      status: UPLOAD_STATUS.PENDING,
    })

    const response = await client
      .get('/storages')
      .qs({ search: 'pdf', status: 'UPLOADED' })
      .cookies(session)

    response.assertStatus(200)
    assert.lengthOf(page(response).data, 1)
    assert.equal(page(response).data[0]?.id, confirmed.id)
  })

  test('when ?sort is outside the closed tuple, answers 422 pointing at the field', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)

    // `path` is a column of `storages`, but not a sort column: the value would go
    // straight into `orderBy` and compose SQL.
    //
    // The query goes in the URL itself, and not in `.qs()`: the Tuyau registry types the
    // object by the closed tuple, and the invalid value this test exists to
    // send would not compile.
    const response = await client.get('/storages?sort=path').cookies(session)

    response.assertStatus(422)
    assert.property(errorBody(response).errors, 'sort')
  })

  test('when there is no session, answers 401', async ({ client }) => {
    const response = await client.get('/storages')

    response.assertStatus(401)
  })
})
