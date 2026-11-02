import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { resetDatabase } from '#tests/database-fixtures'
import { errorBody, page } from '#tests/response-fixtures'
import { neighborhood } from '#tests/storefront-fixtures'

/** The public neighborhood list: `GET /storefront/neighborhoods`, with no cookie anywhere in this file. */
test.group('storefront > neighborhoods > paginate', (group) => {
  group.each.setup(() => resetDatabase())

  test('when listing, answers 200 in alphabetical order with the slug, the name and the center only', async ({
    client,
    assert,
  }) => {
    await neighborhood({
      slug: 'colonia',
      name: 'Colônia',
      lat: -4.3828,
      lng: -70.0368,
    })
    await neighborhood({
      slug: 'centro',
      name: 'Centro',
      lat: -4.3775,
      lng: -70.0312,
    })

    const response = await client.get('/storefront/neighborhoods')

    response.assertStatus(200)
    assert.deepEqual(page(response).data, [
      { slug: 'centro', name: 'Centro', lat: -4.3775, lng: -70.0312 },
      { slug: 'colonia', name: 'Colônia', lat: -4.3828, lng: -70.0368 },
    ])
    assert.equal(page(response).meta.total, 2)
  })

  test('when one is in the trash, it does not come out', async ({
    client,
    assert,
  }) => {
    await neighborhood({ slug: 'centro', name: 'Centro' })
    await neighborhood({
      slug: 'arquivado',
      name: 'Arquivado',
      deletedAt: DateTime.now(),
    })

    const response = await client.get('/storefront/neighborhoods')

    response.assertStatus(200)
    assert.deepEqual(
      page(response).data.map((item) => item.slug),
      ['centro'],
    )
  })

  test('when ?direction is desc and ?search is sent, it follows both', async ({
    client,
    assert,
  }) => {
    await neighborhood({ slug: 'cidade-nova', name: 'Cidade Nova' })
    await neighborhood({ slug: 'centro', name: 'Centro' })

    const response = await client
      .get('/storefront/neighborhoods')
      .qs({ search: 'ce', direction: 'desc' })

    response.assertStatus(200)
    assert.deepEqual(
      page(response).data.map((item) => item.slug),
      ['centro'],
    )
  })

  test('when ?sort is outside the closed tuple, answers 422 pointing at the field', async ({
    client,
    assert,
  }) => {
    const response = await client.get('/storefront/neighborhoods?sort=lat')

    response.assertStatus(422)
    assert.property(errorBody(response).errors, 'sort')
  })
})
