import { test } from '@japa/runner'

import IdGeneratorFake from '#services/id-generator/id-generator.fake'
import IdGeneratorService from '#services/id-generator/id-generator.service'

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

test.group('services > id-generator', () => {
  test('when asking for two ids, it receives two different UUID v4s', ({
    assert,
  }) => {
    const generator = new IdGeneratorService()
    const first = generator.next()

    assert.match(first, UUID_V4)
    assert.notEqual(first, generator.next())
  })

  test('when the fake is used, the ids come out in sequence and in the real format', ({
    assert,
  }) => {
    const generator = new IdGeneratorFake()

    assert.equal(generator.next(), '00000000-0000-4000-8000-000000000001')
    assert.match(generator.next(), UUID_V4)
  })
})
