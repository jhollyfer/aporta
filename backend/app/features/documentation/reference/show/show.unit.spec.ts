import { test } from '@japa/runner'

import DocumentationReferenceShowUseCase from './show.use-case.ts'

test.group('documentation > reference > show (unit)', () => {
  test('when called, returns the reference page pointing at the OpenAPI document', async ({
    assert,
  }) => {
    const result = await new DocumentationReferenceShowUseCase().execute()

    if (result.isLeft()) return assert.fail(result.value.message)

    assert.include(result.value, '<html')
    assert.include(result.value, '/openapi.json')
  })
})
