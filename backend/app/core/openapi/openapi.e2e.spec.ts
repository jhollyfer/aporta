import router from '@adonisjs/core/services/router'
import { test } from '@japa/runner'

import { toOpenAPIPath } from '../../../scripts/openapi/emit.ts'

import openapi from '#config/openapi'
import { readOpenapiDocument } from '#tests/openapi-fixtures'

/**
 * The committed OpenAPI document.
 *
 * The generator **derives** the document from the controllers' AST, which is exactly
 * why it can silently lose an operation: renaming a validator's export
 * without touching the controller does not break the build, `loadValidator`
 * swallows the import failure and the operation leaves the document without a single error.
 *
 * The guard against this is `node ace openapi:generate --check`. This file is the
 * second half of the guard: it checks that the repository's `openapi.json`
 * describes the real router, comparing against `router.toJSON()` instead of
 * a hand-written list - a new route falls into the comparison by construction.
 * The path conversion is the generator's (`toOpenAPIPath`), not a copy.
 */

type Operation = { path: string; method: string }

/** Every registered operation: path and verb, without the `HEAD`s the framework generates. */
function registeredOperations(): Array<Operation> {
  const operations: Array<Operation> = []

  for (const route of Object.values(router.toJSON()).flat()) {
    const { path } = toOpenAPIPath(route.pattern)

    if (openapi.ignore.includes(path) || openapi.ignore.includes(route.pattern))
      continue

    for (const method of route.methods) {
      if (method === 'HEAD') continue

      operations.push({ path, method: method.toLowerCase() })
    }
  }

  return operations
}

test.group('documentation > the document describes the router', () => {
  test('when the routes are registered, every one is in the document', async ({
    assert,
  }) => {
    const { paths } = await readOpenapiDocument()
    const missing = registeredOperations().filter(
      ({ path, method }) => !paths[path]?.[method],
    )

    // The message lists what is missing instead of just failing: whoever breaks this
    // by renaming a validator needs to know which operation vanished, and `--check`
    // alone only says the file diverged.
    assert.deepEqual(
      missing,
      [],
      `operations registered but missing from openapi.json: ${missing
        .map(({ method, path }) => `${method.toUpperCase()} ${path}`)
        .join(', ')}. Run \`node ace openapi:generate\`.`,
    )
  })

  test('when the document is read, does not describe a route that does not exist', async ({
    assert,
  }) => {
    const { paths } = await readOpenapiDocument()
    const registered = new Set(
      registeredOperations().map(({ path, method }) => `${method} ${path}`),
    )

    const extra: string[] = []

    for (const [path, operations] of Object.entries(paths)) {
      for (const method of Object.keys(operations)) {
        if (!registered.has(`${method} ${path}`))
          extra.push(`${method} ${path}`)
      }
    }

    assert.deepEqual(
      extra,
      [],
      `the document promises what the router does not serve: ${extra.join(', ')}`,
    )
  })

  test('when the operations are read, none is left without a described response', async ({
    assert,
  }) => {
    const { paths } = await readOpenapiDocument()
    const mute: string[] = []

    for (const [path, operations] of Object.entries(paths)) {
      for (const [method, operation] of Object.entries(operations)) {
        // Only success responses count: the generator builds the failure ones
        // on its own from the route's protection, so their being there proves nothing
        // about the contract of whoever called and succeeded.
        const success = Object.keys(operation.responses).filter(
          (status) => Number(status) < 400,
        )

        if (success.length === 0) mute.push(`${method.toUpperCase()} ${path}`)
      }
    }

    assert.deepEqual(
      mute,
      [],
      `operations with no success response described: ${mute.join(', ')}`,
    )
  })

  test('when the operations are read, each identifier is unique', async ({
    assert,
  }) => {
    const { paths } = await readOpenapiDocument()
    const seen = new Map<string, string>()
    const repeated: string[] = []

    for (const [path, operations] of Object.entries(paths)) {
      for (const [method, operation] of Object.entries(operations)) {
        const previous = seen.get(operation.operationId)

        // `operationId` is what becomes a function name in a generated client. Two
        // equal ones compile as a single function, with one of the two operations
        // overwriting the other.
        if (previous)
          repeated.push(
            `${operation.operationId}: ${previous} e ${method} ${path}`,
          )

        seen.set(operation.operationId, `${method} ${path}`)
      }
    }

    assert.deepEqual(
      repeated,
      [],
      `operationId repetido: ${repeated.join(', ')}`,
    )
  })

  test('when the server is read, is the variable, not the address of whoever generated it', async ({
    assert,
  }) => {
    // Writing the `APP_SERVER_URL` of whoever generated it would make `--check` report
    // divergence on every machine with another `.env`.
    const { servers } = await readOpenapiDocument()

    assert.deepEqual(
      servers.map(({ url }) => url),
      ['{APP_SERVER_URL}'],
    )
  })
})

/**
 * Routes that are not API operations: the probe and the documentation. None
 * appears in the document itself - if they were operations, they would be documented
 * like the others.
 */
test.group('documentation > service routes', () => {
  test('when the root is called, is not a probe: the only one is `/health-check`', async ({
    client,
  }) => {
    const response = await client.get('/').redirects(0)

    response.assertStatus(404)
  })

  test('when the probes are checked, none of them appears in the document', async ({
    assert,
  }) => {
    const { paths } = await readOpenapiDocument()

    for (const path of [
      '/',
      '/health-check',
      '/openapi.json',
      '/documentation',
    ]) {
      assert.isUndefined(
        paths[path],
        `${path} is documented, and is not an API operation`,
      )
    }
  })
})
