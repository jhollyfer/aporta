import { test } from '@japa/runner'

import UserModel from '#models/user'
import { resetDatabase, storageRecord } from '#tests/database-fixtures'
import { errorBody } from '#tests/response-fixtures'
import { authenticateAsAdministrator } from '#tests/session-fixtures'

/**
 * The response language follows `Accept-Language` (`_standards/i18n.md` §3).
 *
 * Real routes, one per message path: the file listing with a malformed `page` produces the
 * VineJS 422 (`validator.json`), a nonexistent file produces the business 404 (`errors.json`),
 * and deleting a file in use produces the per-field 409 (`fields.json`). The `code` is contract
 * and does not change with the language. The pt-BR assertions in the other E2E tests still
 * hold: without a header, the language is the default.
 *
 * The routes need a session because every API route does, and `sign-in` is not an option here:
 * it has a throttle, and repeating the request would spend the quota of the CORS and origin specs.
 */

const INVALID_PAGE = '/storages?page=abc'
const MISSING_FILE = '/storages/00000000-0000-4000-8000-000000000000'

const LANGUAGES = [
  {
    header: 'es',
    invalid: 'Datos no válidos',
    page: 'Ingrese un número válido',
    missing: 'Archivo no encontrado',
    route: 'Ruta no encontrada',
    inUse:
      'El archivo está en uso en: avatar de usuario. Desvincúlalo antes de eliminarlo.',
  },
  {
    header: 'en',
    invalid: 'Invalid data',
    page: 'Enter a valid number',
    missing: 'File not found',
    route: 'Route not found',
    inUse: 'The file is in use in: user avatar. Unlink it before deleting it.',
  },
  {
    header: 'pt-BR',
    invalid: 'Dados inválidos',
    page: 'Informe um número válido',
    missing: 'Arquivo não encontrado',
    route: 'Rota não encontrada',
    inUse:
      'Arquivo em uso em: avatar de usuário. Desvincule-o antes de excluí-lo.',
  },
]

test.group('language > Accept-Language', (group) => {
  group.each.setup(() => resetDatabase())

  for (const language of LANGUAGES) {
    test(`when the language is ${language.header}, the validation 422 and the business 404 come out in it`, async ({
      client,
      assert,
    }) => {
      const session = await authenticateAsAdministrator(client)

      const invalid = await client
        .get(INVALID_PAGE)
        .cookies(session)
        .header('Accept-Language', language.header)

      invalid.assertStatus(422)
      assert.equal(errorBody(invalid).code, 'VALIDATION_ERROR')
      assert.equal(errorBody(invalid).message, language.invalid)
      assert.deepEqual(errorBody(invalid).errors, { page: language.page })

      const missing = await client
        .get(MISSING_FILE)
        .cookies(session)
        .header('Accept-Language', language.header)

      missing.assertStatus(404)
      assert.equal(errorBody(missing).code, 'STORAGE_NOT_FOUND')
      assert.equal(errorBody(missing).message, language.missing)
    })
  }

  test('when the header is absent, answers in pt-BR', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const response = await client.get(MISSING_FILE).cookies(session)

    response.assertStatus(404)
    assert.equal(errorBody(response).message, 'Arquivo não encontrado')
  })

  test('when the language is outside the list, falls back to pt-BR', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const response = await client
      .get(MISSING_FILE)
      .cookies(session)
      .header('Accept-Language', 'fr-FR,fr;q=0.9')

    response.assertStatus(404)
    assert.equal(errorBody(response).message, 'Arquivo não encontrado')
  })

  test('when the preference is weighted, picks the first supported language', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const response = await client
      .get(MISSING_FILE)
      .cookies(session)
      .header('Accept-Language', 'fr;q=0.9, en-US;q=0.8, es;q=0.5')

    response.assertStatus(404)
    assert.equal(errorBody(response).message, 'File not found')
  })

  test('when one request sets the language, does not leak it to the next', async ({
    client,
    assert,
  }) => {
    const session = await authenticateAsAdministrator(client)
    const english = await client
      .get(INVALID_PAGE)
      .cookies(session)
      .header('Accept-Language', 'en')
    const fallback = await client.get(INVALID_PAGE).cookies(session)

    assert.deepEqual(errorBody(english).errors, {
      page: 'Enter a valid number',
    })
    assert.deepEqual(errorBody(fallback).errors, {
      page: 'Informe um número válido',
    })
  })
})

test.group('language > nonexistent route and per-field error', (group) => {
  group.each.setup(() => resetDatabase())

  for (const language of LANGUAGES) {
    test(`when the language is ${language.header}, the framework 404 uses the house envelope and the per-field error is translated`, async ({
      client,
      assert,
    }) => {
      const route = await client
        .get('/nao-existe')
        .header('Accept-Language', language.header)

      route.assertStatus(404)
      assert.deepEqual(errorBody(route), {
        message: language.route,
        status: 404,
        code: 'ROUTE_NOT_FOUND',
      })

      const session = await authenticateAsAdministrator(client)
      const file = await storageRecord()
      await UserModel.query()
        .where('email', 'administrator@example.com')
        .update({ avatarId: file.id })

      const field = await client
        .delete(`/storages/${file.id}`)
        .cookies(session)
        .header('Accept-Language', language.header)

      field.assertStatus(409)
      assert.equal(errorBody(field).code, 'STORAGE_IN_USE')
      assert.deepEqual(errorBody(field).errors, { id: language.inUse })
    })
  }
})
