import { LISTING_STATUS } from '@aporta/shared'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { UserFactory } from '#database/factories/user.factory'
import UserModel from '#models/user'
import { resetDatabase } from '#tests/database-fixtures'
import { body, errorBody, object } from '#tests/response-fixtures'
import {
  authenticateAsModerator,
  authenticateAsOwner,
  authenticateAsOwnerAccount,
} from '#tests/session-fixtures'
import { listingWithStatus, neighborhood } from '#tests/storefront-fixtures'

const MISSING = '00000000-0000-4000-8000-000000000000'
const url = (id: string): string => `/administrator/owners/${id}/verification`

/**
 * The "verified owner" seal, end to end. The contract asserted here: the seal is the account's, so
 * it shows on every ad of the account (the ones written later included); the ad's own column only
 * counts for an ad with no account; and a new contact takes the seal away.
 */
test.group('administrator > owners > verify', (group) => {
  group.each.setup(() => resetDatabase())

  test('when the moderator verifies an owner, every ad of the account shows the seal on the storefront, and an ad written after it too', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    const staff = await authenticateAsModerator(client)
    const owner = await UserFactory.create()
    const make = (slug: string) =>
      listingWithStatus(LISTING_STATUS.PUBLISHED, {
        slug,
        neighborhoodId: centro.id,
        ownerId: owner.id,
      })
    await make('primeira')
    await make('segunda')

    const response = await client
      .put(url(owner.id))
      .cookies(staff)
      .json({ verified: true })
    await make('terceira')

    response.assertStatus(200)
    assert.deepEqual(
      { id: body(response).id, verified: body(response).verified },
      { id: owner.id, verified: true },
    )
    assert.isString(body(response).verifiedAt)
    for (const slug of ['primeira', 'segunda', 'terceira']) {
      const show = await client.get(`/storefront/listings/${slug}`)
      assert.isTrue(object(body(show).owner).verified, slug)
    }
  })

  test('when the seal is taken away, the storefront stops showing it', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    const staff = await authenticateAsModerator(client)
    const owner = await UserFactory.merge({
      verifiedAt: DateTime.now(),
    }).create()
    await listingWithStatus(LISTING_STATUS.PUBLISHED, {
      slug: 'sem-selo',
      neighborhoodId: centro.id,
      ownerId: owner.id,
    })

    const response = await client
      .put(url(owner.id))
      .cookies(staff)
      .json({ verified: false })

    response.assertStatus(200)
    assert.deepEqual(body(response).verified, false)
    assert.isNull(body(response).verifiedAt)
    const show = await client.get('/storefront/listings/sem-selo')
    assert.isFalse(object(body(show).owner).verified)
  })

  test('when the account owns the ad, the old column on the ad is ignored; when the ad has no account, the column still counts', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    const owner = await UserFactory.create()
    await listingWithStatus(LISTING_STATUS.PUBLISHED, {
      slug: 'com-conta',
      neighborhoodId: centro.id,
      ownerId: owner.id,
      ownerVerifiedAt: DateTime.now(),
    })
    await listingWithStatus(LISTING_STATUS.PUBLISHED, {
      slug: 'sem-conta',
      neighborhoodId: centro.id,
      ownerId: null,
      ownerVerifiedAt: DateTime.now(),
    })

    const withAccount = await client.get('/storefront/listings/com-conta')
    const withoutAccount = await client.get('/storefront/listings/sem-conta')

    assert.isFalse(object(body(withAccount).owner).verified)
    assert.isTrue(object(body(withoutAccount).owner).verified)
  })

  test('when the owner changes the contact of an ad, the account loses the seal; when only the title changes, it keeps it', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood()
    const owner = await authenticateAsOwnerAccount(client)
    await UserModel.query()
      .where('id', owner.userId)
      .update({ verifiedAt: DateTime.now() })
    const row = await listingWithStatus(LISTING_STATUS.PUBLISHED, {
      slug: 'contato',
      neighborhoodId: centro.id,
      ownerId: owner.userId,
    })

    await client
      .put(`/owner/listings/${row.id}`)
      .cookies(owner.session)
      .json({ title: 'Titulo novo do anuncio' })
    const kept = await client.get('/storefront/listings/contato')

    await client
      .put(`/owner/listings/${row.id}`)
      .cookies(owner.session)
      .json({ whatsapp: '5597999990099' })
    const lost = await client.get('/storefront/listings/contato')

    assert.isTrue(object(body(kept).owner).verified)
    assert.isFalse(object(body(lost).owner).verified)
    assert.isNull((await UserModel.findOrFail(owner.userId)).verifiedAt)
  })

  test('when the account is staff, verifying answers 409; when it does not exist, 404; when the body is wrong, 422', async ({
    client,
    assert,
  }) => {
    const staff = await authenticateAsModerator(client)
    const other = await UserFactory.apply('moderator').create()

    const notOwner = await client
      .put(url(other.id))
      .cookies(staff)
      .json({ verified: true })
    const missing = await client
      .put(url(MISSING))
      .cookies(staff)
      .json({ verified: true })
    const wrong = await client
      .put(url(other.id))
      .cookies(staff)
      .json({ verified: 'yes' })

    notOwner.assertStatus(409)
    assert.equal(errorBody(notOwner).code, 'USER_NOT_VERIFIABLE')
    missing.assertStatus(404)
    assert.equal(errorBody(missing).code, 'USER_NOT_FOUND')
    wrong.assertStatus(422)
    assert.property(errorBody(wrong).errors, 'verified')
  })

  test('when the caller is an owner, answers 403 and nobody is verified; with no session, 401', async ({
    client,
    assert,
  }) => {
    const owner = await authenticateAsOwner(client)
    const target = await UserFactory.create()

    const forbidden = await client
      .put(url(target.id))
      .cookies(owner)
      .json({ verified: true })
    const anonymous = await client.put(url(target.id)).json({ verified: true })

    forbidden.assertStatus(403)
    anonymous.assertStatus(401)
    assert.isNull((await UserModel.findOrFail(target.id)).verifiedAt)
  })
})
