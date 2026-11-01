import { test } from '@japa/runner'

import { errorBody } from '#tests/response-fixtures'

/**
 * The 422 of a real route: the `validator.unit.spec.ts` specs read the message map,
 * this one reads the response. It is what proves the `SimpleMessagesProvider`
 * was actually installed - a correct map that nobody registered would pass in
 * the others.
 */
test.group('messages > validation provider (e2e)', () => {
  test('when a real route answers 422, comes out entirely in Portuguese', async ({
    client,
    assert,
  }) => {
    const response = await client
      .post('/authentication/sign-in')
      .json({ email: 'nao-e-email', password: 'Qualquer1!' })

    response.assertStatus(422)

    assert.deepEqual(errorBody(response).errors, {
      email: 'Informe um e-mail válido',
    })
  })
})
