import { test } from '@japa/runner'

import DocumentationOpenapiShowUseCase from './show.use-case.ts'

import env from '#start/env'

test.group('documentation > openapi > show (unit)', () => {
  test('when called, returns the committed document with this environment as the only server', async ({
    assert,
  }) => {
    const result = await new DocumentationOpenapiShowUseCase().execute()

    if (result.isLeft()) return assert.fail(result.value.message)

    assert.property(result.value, 'paths')
    assert.deepEqual(result.value.servers, [
      { url: env.get('APP_SERVER_URL'), description: 'Servidor atual' },
    ])
  })

  test('when called twice, reads the file once and serves the same document afterwards', async ({
    assert,
  }) => {
    const useCase = new DocumentationOpenapiShowUseCase()
    const first = await useCase.execute()
    const second = await useCase.execute()

    if (first.isLeft() || second.isLeft()) return assert.fail('left')

    assert.strictEqual(first.value, second.value)
  })
})
