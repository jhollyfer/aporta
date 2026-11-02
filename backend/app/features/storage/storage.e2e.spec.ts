import { LISTING_STATUS, STORAGE_MIMETYPE } from '@aporta/shared'
import { test } from '@japa/runner'

import { ListingPhotoFactory } from '#database/factories/listing-photo.factory'
import Storage from '#models/storage'
import { resetDatabase, storageRecord } from '#tests/database-fixtures'
import { body, errorBody, page } from '#tests/response-fixtures'
import {
  authenticateAsAdministrator,
  authenticateAsOwnerAccount,
} from '#tests/session-fixtures'
import { listingWithStatus, neighborhood } from '#tests/storefront-fixtures'

const MISSING = '00000000-0000-4000-8000-000000000000'

/**
 * What an owner of properties reaches inside `/storages`, across the actions: his own files and
 * nothing else. The rows are written by the factory, so these cases do not need the bucket: the
 * policy answers before any action touches it, and that is the point.
 *
 * The contract asserted here is the one `StoragePolicy` promises: a file of another account
 * answers **exactly** like one that does not exist, on every route that takes an id, and the
 * staff keeps the whole collection.
 */
test.group(
  'storage > ownership (the OWNER reaches only his own files)',
  (group) => {
    group.each.setup(() => resetDatabase())

    test('when listing, an owner gets only the files he sent, and the staff gets all of them', async ({
      client,
      assert,
    }) => {
      const mine = await authenticateAsOwnerAccount(client)
      const other = await authenticateAsOwnerAccount(client)
      await storageRecord({ ownerId: mine.userId, originalName: 'minha.png' })
      await storageRecord({ ownerId: other.userId, originalName: 'alheia.png' })
      const admin = await authenticateAsAdministrator(client)

      const own = await client.get('/storages').cookies(mine.session)
      const all = await client.get('/storages').cookies(admin)

      own.assertStatus(200)
      assert.deepEqual(
        page(own).data.map((file) => file.originalName),
        ['minha.png'],
      )
      // The count comes from the same query: another account's files are not even counted.
      assert.equal(page(own).meta.total, 1)
      assert.equal(page(all).meta.total, 2)
    })

    test('when reading, an owner gets his own file with the signed url', async ({
      client,
      assert,
    }) => {
      const { session, userId } = await authenticateAsOwnerAccount(client)
      const file = await storageRecord({ ownerId: userId })

      const response = await client.get(`/storages/${file.id}`).cookies(session)

      response.assertStatus(200)
      assert.include(String(body(response).url), file.path)
    })

    test("when the file is another account's, every route with an id answers the same 404 as for a missing file", async ({
      client,
      assert,
    }) => {
      const other = await authenticateAsOwnerAccount(client)
      const { session } = await authenticateAsOwnerAccount(client)
      const foreign = await storageRecord({ ownerId: other.userId })

      const requests = (id: string) => [
        client.get(`/storages/${id}`).cookies(session),
        client.get(`/storages/${id}/parts`).cookies(session),
        client.get(`/storages/${id}/download`).cookies(session).redirects(0),
        client.post(`/storages/${id}/complete`).cookies(session).json({}),
        client.delete(`/storages/${id}`).cookies(session),
      ]

      const probed = await Promise.all(requests(foreign.id))
      const missing = await Promise.all(requests(MISSING))

      for (const [index, response] of probed.entries()) {
        response.assertStatus(404)
        assert.deepEqual(
          errorBody(response),
          errorBody(missing[index] ?? response),
        )
        assert.equal(errorBody(response).code, 'STORAGE_NOT_FOUND')
      }
      assert.isNotNull(await Storage.find(foreign.id))
    })

    test('when the owner downloads his own file, redirects to a signed bucket URL', async ({
      client,
      assert,
    }) => {
      const { session, userId } = await authenticateAsOwnerAccount(client)
      const file = await storageRecord({ ownerId: userId })

      const response = await client
        .get(`/storages/${file.id}/download`)
        .cookies(session)
        .redirects(0)

      response.assertStatus(302)
      assert.include(response.header('location'), 'X-Amz-Signature')
    })

    test('when the staff reads a file an owner sent, it reaches it', async ({
      client,
    }) => {
      const { userId } = await authenticateAsOwnerAccount(client)
      const file = await storageRecord({ ownerId: userId })
      const admin = await authenticateAsAdministrator(client)

      const response = await client.get(`/storages/${file.id}`).cookies(admin)

      response.assertStatus(200)
    })

    test("when the owner's file is a photo of an ad, deleting it answers 409 and says where it is used", async ({
      client,
      assert,
    }) => {
      const centro = await neighborhood()
      const { session, userId } = await authenticateAsOwnerAccount(client)
      const ad = await listingWithStatus(LISTING_STATUS.PUBLISHED, {
        neighborhoodId: centro.id,
        ownerId: userId,
      })
      const file = await storageRecord({
        ownerId: userId,
        mimetype: STORAGE_MIMETYPE.PNG,
      })
      await ListingPhotoFactory.merge({
        listingId: ad.id,
        position: 0,
        storageId: file.id,
      }).create()

      const response = await client
        .delete(`/storages/${file.id}`)
        .cookies(session)

      response.assertStatus(409)
      assert.equal(errorBody(response).code, 'STORAGE_IN_USE')
      assert.include(String(errorBody(response).errors?.id), 'foto de anúncio')
      assert.isNotNull(await Storage.find(file.id))
    })

    test('when the file is deleted for good while a photo points at it, the slot stays and loses the picture', async ({
      client,
      assert,
    }) => {
      const centro = await neighborhood()
      const { userId } = await authenticateAsOwnerAccount(client)
      const ad = await listingWithStatus(LISTING_STATUS.PUBLISHED, {
        neighborhoodId: centro.id,
        ownerId: userId,
      })
      const file = await storageRecord({ ownerId: userId })
      const photo = await ListingPhotoFactory.merge({
        listingId: ad.id,
        position: 0,
        storageId: file.id,
      }).create()

      // The administrator path of last resort (`storages:prune` and a manual cleanup do the same):
      // the foreign key is `SET NULL`, so the ad keeps its slot and the frontend draws the room.
      await file.delete()
      await photo.refresh()

      assert.isNull(photo.storageId)
    })
  },
)
