import { LISTING_STATUS } from '@aporta/shared'
import { test } from '@japa/runner'

import { resetDatabase } from '#tests/database-fixtures'
import { errorBody, page } from '#tests/response-fixtures'
import { authenticateAsOwnerAccount } from '#tests/session-fixtures'
import {
  archivedListing,
  listing,
  listingWithStatus,
  neighborhood,
} from '#tests/storefront-fixtures'

/**
 * The owner's own list. What matters here is the scope: the account is the session's, applied
 * inside the query, so another owner's ads are not in the page **nor in its count**, and the
 * panel sees the states the storefront hides.
 */
test.group('owner > listings > paginate', (group) => {
  group.each.setup(() => resetDatabase())

  test('when listing, brings only the ads of the session account, in every status outside the trash', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    const mine = await authenticateAsOwnerAccount(client)
    const other = await authenticateAsOwnerAccount(client)
    const own = { neighborhoodId: centro.id, ownerId: mine.userId }
    await listingWithStatus(LISTING_STATUS.PUBLISHED, { ...own, slug: 'a' })
    await listingWithStatus(LISTING_STATUS.PENDING, { ...own, slug: 'b' })
    await listingWithStatus(LISTING_STATUS.DRAFT, { ...own, slug: 'c' })
    await archivedListing({ ...own, slug: 'arquivada' })
    await listing({
      neighborhoodId: centro.id,
      ownerId: other.userId,
      slug: 'de-outro',
    })
    await listing({
      neighborhoodId: centro.id,
      ownerId: null,
      slug: 'sem-dono',
    })

    const response = await client.get('/owner/listings').cookies(mine.session)

    response.assertStatus(200)
    const { data, meta } = page(response)
    assert.sameMembers(
      data.map((each) => each.slug),
      ['a', 'b', 'c'],
    )
    assert.equal(meta.total, 3)
    assert.sameMembers(
      data.map((each) => each.status),
      ['PUBLISHED', 'PENDING', 'DRAFT'],
    )
  })

  test('when the account has no ads, answers an empty page', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    const other = await authenticateAsOwnerAccount(client)
    await listing({ neighborhoodId: centro.id, ownerId: other.userId })
    const { session } = await authenticateAsOwnerAccount(client)

    const response = await client.get('/owner/listings').cookies(session)

    response.assertStatus(200)
    assert.deepEqual(page(response).data, [])
    assert.equal(page(response).meta.total, 0)
  })

  test('when ?status and ?search are sent, narrows inside the account', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    const { session, userId } = await authenticateAsOwnerAccount(client)
    const own = { neighborhoodId: centro.id, ownerId: userId }
    await listingWithStatus(LISTING_STATUS.PENDING, {
      ...own,
      slug: 'quintal',
      title: 'Casa com quintal',
    })
    await listingWithStatus(LISTING_STATUS.PUBLISHED, {
      ...own,
      slug: 'kitnet',
    })

    const pending = await client
      .get('/owner/listings')
      .cookies(session)
      .qs({ status: 'PENDING' })
    const search = await client
      .get('/owner/listings')
      .cookies(session)
      .qs({ search: 'quintal' })

    assert.deepEqual(
      page(pending).data.map((each) => each.slug),
      ['quintal'],
    )
    assert.deepEqual(
      page(search).data.map((each) => each.slug),
      ['quintal'],
    )
  })

  test('when ?status is outside the closed list, answers 422 pointing at the field', async ({
    client,
    assert,
  }) => {
    const { session } = await authenticateAsOwnerAccount(client)

    const response = await client
      .get('/owner/listings')
      .cookies(session)
      .qs({ status: 'SOLD' })

    response.assertStatus(422)
    assert.property(errorBody(response).errors ?? {}, 'status')
  })

  test('when there is no session, answers 401', async ({ client }) => {
    const response = await client.get('/owner/listings')

    response.assertStatus(401)
  })
})
