import { test } from '@japa/runner'

import Translation from '#core/translation'

/**
 * The language inside a request is covered by the API specs that send `Accept-Language`
 * (`detect-user-locale.middleware.e2e.spec.ts`); here is what happens outside one.
 */
test.group('core > translation (unit)', () => {
  test('when outside a request, answers in the default language, pt-BR', ({
    assert,
  }) => {
    assert.equal(
      Translation.t('errors.STORAGE_NOT_FOUND'),
      'Arquivo não encontrado',
    )
  })

  test('when the message has ICU variables, fills them', ({ assert }) => {
    assert.include(
      Translation.t('fields.STORAGE_IN_USE', {
        references: 'avatar de usuário',
      }),
      'avatar de usuário',
    )
  })

  test('when the key has no translation, it comes out as its last segment', ({
    assert,
  }) => {
    assert.equal(Translation.t('errors.NO_SUCH_CODE'), 'NO_SUCH_CODE')
  })
})
