import { test } from '@japa/runner'

/**
 * `middleware.auth()` is in the `/account` group, and not on each route. This
 * test is what proves it is actually wired: without it, `context.auth.user!`
 * would be `undefined` and the read would answer 500 - or worse, the `id` would come from
 * somewhere else.
 */
test.group('account > without session', () => {
  test('when the request has no cookie, answers 401', async ({ client }) => {
    const read = await client.get('/account')
    const write = await client.put('/account').json({ name: 'Qualquer' })

    read.assertStatus(401)
    write.assertStatus(401)
  })
})
