import { PLACE_CATEGORY } from '@aporta/shared'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { resetDatabase } from '#tests/database-fixtures'
import { errorBody, page } from '#tests/response-fixtures'
import { neighborhood, place, placeOf } from '#tests/storefront-fixtures'

/** The public guide: `GET /storefront/places`, with no cookie anywhere in this file. */
test.group('storefront > places > paginate', (group) => {
  group.each.setup(() => resetDatabase())

  test('when listing, answers 200 by name with the neighborhood slug and name and no panel field', async ({
    client,
    assert,
  }) => {
    const centro = await neighborhood({ slug: 'centro', name: 'Centro' })
    await place({ name: 'Tacacá', neighborhoodId: centro.id })
    await place({
      name: 'Peixaria',
      neighborhoodId: centro.id,
      whatsapp: '5597999990001',
    })

    const response = await client.get('/storefront/places')

    response.assertStatus(200)
    assert.deepEqual(
      page(response).data.map((item) => item.name),
      ['Peixaria', 'Tacacá'],
    )
    assert.deepEqual(page(response).data[0]?.neighborhood, {
      slug: 'centro',
      name: 'Centro',
    })
    assert.sameMembers(Object.keys(page(response).data[0] ?? {}), [
      'id',
      'category',
      'name',
      'description',
      'neighborhood',
      'address',
      'hours',
      'whatsapp',
      'date',
    ])
    assert.equal(page(response).data[0]?.whatsapp, '5597999990001')
  })

  test('when ?category is sent, narrows the tab, and an event carries its day', async ({
    client,
    assert,
  }) => {
    await place({ name: 'Peixaria' })
    await placeOf(PLACE_CATEGORY.EVENT, {
      name: 'Festival',
      date: DateTime.fromISO('2027-06-26'),
    })

    const response = await client
      .get('/storefront/places')
      .qs({ category: 'EVENT' })

    response.assertStatus(200)
    assert.lengthOf(page(response).data, 1)
    assert.equal(page(response).data[0]?.name, 'Festival')
    assert.equal(page(response).data[0]?.date, '2027-06-26')
  })

  test('when ?search is sent, does not escape the category filter', async ({
    client,
    assert,
  }) => {
    const drink = await placeOf(PLACE_CATEGORY.DRINK, {
      name: 'Bar do Beiradão',
      description: 'Cerveja com peixe frito.',
    })
    // It matches by **description**, after the first column, and it is another tab: with a loose
    // `OR` it would show up under `?category=DRINK`.
    await place({ name: 'Peixaria', description: 'Peixe na brasa.' })

    const response = await client
      .get('/storefront/places')
      .qs({ search: 'peixe', category: 'DRINK' })

    response.assertStatus(200)
    assert.deepEqual(
      page(response).data.map((item) => item.id),
      [drink.id],
    )
  })

  test('when one is in the trash, it does not come out', async ({
    client,
    assert,
  }) => {
    await place({ name: 'Viva' })
    await place({ name: 'Arquivada', deletedAt: DateTime.now() })

    const response = await client.get('/storefront/places')

    response.assertStatus(200)
    assert.deepEqual(
      page(response).data.map((item) => item.name),
      ['Viva'],
    )
  })

  test('when ?category or ?sort is outside the closed list, answers 422 pointing at each field', async ({
    client,
    assert,
  }) => {
    const response = await client.get(
      '/storefront/places?category=PARTY&sort=whatsapp',
    )

    response.assertStatus(422)
    assert.property(errorBody(response).errors, 'category')
    assert.property(errorBody(response).errors, 'sort')
  })
})
