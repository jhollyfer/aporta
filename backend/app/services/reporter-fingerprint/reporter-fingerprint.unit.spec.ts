import { test } from '@japa/runner'

import ReporterFingerprintFake from '#services/reporter-fingerprint/reporter-fingerprint.fake'
import ReporterFingerprintService from '#services/reporter-fingerprint/reporter-fingerprint.service'

test.group('services > reporter-fingerprint', () => {
  test('when hashing the same address twice, it gives the same 64 hexadecimal characters', ({
    assert,
  }) => {
    const service = new ReporterFingerprintService()

    assert.match(service.of('203.0.113.7'), /^[0-9a-f]{64}$/)
    assert.equal(service.of('203.0.113.7'), service.of('203.0.113.7'))
  })

  test('when hashing two addresses, it gives two fingerprints and never the address', ({
    assert,
  }) => {
    const service = new ReporterFingerprintService()

    assert.notEqual(service.of('203.0.113.7'), service.of('203.0.113.8'))
    assert.notInclude(service.of('203.0.113.7'), '203.0.113.7')
  })

  test('when using the fake, it needs no secret and keeps the length', ({
    assert,
  }) => {
    const fake = new ReporterFingerprintFake()

    assert.lengthOf(fake.of('203.0.113.7'), 64)
    assert.notEqual(fake.of('a'), fake.of('b'))
  })
})
