import { z } from '@aporta/shared'
import { test } from '@japa/runner'

import { ValidatorsCheck } from './validators-check.ts'

import { vine } from '#core/validator'

test.group('validators:check > pair comparison', () => {
  const check = new ValidatorsCheck()
  const file = 'app/validators/administrator/albums.validator.ts'

  test('when a pair is equal, is not a finding', ({ assert }) => {
    const findings = check.compare({
      file,
      name: 'AlbumCreateValidator',
      vine: vine.create({ title: vine.string().minLength(1).maxLength(255) }),
      zod: z.object({ title: z.string().min(1).max(255) }),
    })

    assert.deepEqual(findings, [])
  })

  test('when a ceiling differs, is a §10 finding, in the backend file', ({
    assert,
  }) => {
    const [finding] = check.compare({
      file,
      name: 'AlbumCreateValidator',
      vine: vine.create({ title: vine.string().maxLength(255) }),
      zod: z.object({ title: z.string().max(300) }),
    })

    assert.equal(finding?.file, file)
    assert.equal(finding?.rule, 'validator-diverge')
    assert.equal(finding?.section, '10')
    assert.include(finding?.message ?? '', 'maxLength 255 in the backend, 300')
  })

  test('when a field is on one side only and enum values differ, are findings', ({
    assert,
  }) => {
    const findings = check.compare({
      file,
      name: 'X',
      vine: vine.create({ kind: vine.enum(['A', 'B']), extra: vine.string() }),
      zod: z.object({ kind: z.enum(['A', 'B', 'C']) }),
    })

    assert.lengthOf(findings, 3)
  })

  test('when a validator has no pair in shared, is a finding', ({ assert }) => {
    const [finding] = check.compare({
      file,
      name: 'AlbumCreateValidator',
      vine: vine.create({ title: vine.string() }),
      zod: undefined,
    })

    assert.equal(finding?.rule, 'validator-without-pair')
  })

  test('when the VineJS date is read, is a wildcard, and the password confirmation matches `confirmed`', ({
    assert,
  }) => {
    const findings = check.compare({
      file,
      name: 'X',
      vine: vine.create({
        date: vine.date(),
        password: vine.string().confirmed({ as: 'passwordConfirmation' }),
      }),
      zod: z.object({
        date: z.string().max(40),
        password: z.string(),
        passwordConfirmation: z.string(),
      }),
    })

    assert.deepEqual(findings, [])
  })
})

test.group('validators:check > exceptions', () => {
  const check = new ValidatorsCheck()
  const finding = {
    file: 'a',
    line: 1,
    rule: 'validator-diverge',
    section: '10',
    message: '`Y.size`: maximum 1 in the backend, 2 in shared',
  }

  test('when an exception is used, makes the finding vanish', ({ assert }) => {
    const kept = check.applyExceptions(
      [finding],
      [{ key: 'Y.size:maximum', reason: 'teste' }],
    )

    assert.deepEqual(kept, [])
  })

  test('when an exception is unused, fails', ({ assert }) => {
    const [kept] = check.applyExceptions(
      [],
      [{ key: 'Z.nada', reason: 'teste' }],
    )

    assert.equal(kept?.rule, 'unused-exception')
  })
})
