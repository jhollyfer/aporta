import { authApiClient } from '@adonisjs/auth/plugins/api_client'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import { dbAssertions } from '@adonisjs/lucid/plugins/db'
import { apiClient } from '@japa/api-client'
import { assert } from '@japa/assert'
import { pluginAdonisJS } from '@japa/plugin-adonisjs'
import { disallowPinnedTests } from '@japa/runner/plugins'
import { spec } from '@japa/runner/reporters'
import type { Config } from '@japa/runner/types'

import type { Registry } from '../.adonisjs/client/registry/schema.d.ts'

/**
 * This file is imported by the "bin/test.ts" entrypoint file
 */
declare module '@japa/api-client/types' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-empty-object-type -- declaration merging requires `interface`, which adds no members here
  interface RoutesRegistry extends Registry {}
}

/**
 * This file is imported by the "bin/test.ts" entrypoint file
 */

/**
 * Configure Japa plugins in the plugins array.
 * Learn more - https://japa.dev/docs/runner-config#plugins-optional
 */
export const plugins: Config['plugins'] = [
  // A forgotten `.pin()` makes the runner run only the pinned test and leaves CI green without
  // the suite; in CI the plugin fails the run instead.
  disallowPinnedTests({ disallow: Boolean(process.env.CI) }),
  assert(),
  pluginAdonisJS(app),
  dbAssertions(app),
  apiClient(),
  authApiClient(app),
]

/**
 * Reporters. Japa does not ship a TAP reporter, and the specification audit
 * engine reads exactly `ok N - title` / `not ok N - title` to know
 * which acceptance criteria passed.
 *
 * Enabled by `ONP_TAP=1` instead of `--reporter=tap`: an environment variable
 * crosses `node ace test` without depending on flag forwarding.
 */
const REPORTERS = {
  spec: { activated: ['spec'], list: [spec()] },
  tap: {
    activated: ['tap'],
    list: [
      {
        name: 'tap',
        handler: (_runner, emitter) => {
          let count = 0

          emitter.on('runner:start', () => {
            process.stdout.write('TAP version 13\n')
          })

          emitter.on('test:end', (test) => {
            count += 1
            const title = test.title.expanded

            // Skipped is not proof: it comes out as `ok ... # SKIP`, which the engine
            // recognizes and refuses as evidence.
            if (test.isTodo) {
              process.stdout.write(`ok ${count} - ${title} # TODO\n`)
              return
            }

            if (test.isSkipped) {
              process.stdout.write(
                `${`ok ${count} - ${title} # SKIP ${test.skipReason ?? ''}`.trimEnd()}\n`,
              )
              return
            }

            if (test.hasError) {
              process.stdout.write(`not ok ${count} - ${title}\n`)

              for (const { error } of test.errors) {
                process.stdout.write(
                  `  # ${error.message.split('\n').join('\n  # ')}\n`,
                )
              }

              return
            }

            process.stdout.write(`ok ${count} - ${title}\n`)
          })

          emitter.on('runner:end', () => {
            process.stdout.write(`1..${count}\n`)
          })
        },
      },
    ],
  },
} satisfies Record<string, Config['reporters']>

let reporterMode: keyof typeof REPORTERS = 'spec'
if (process.env.ONP_TAP === '1') reporterMode = 'tap'

export const reporters: Config['reporters'] = REPORTERS[reporterMode]

/**
 * Configure lifecycle function to run before and after all the
 * tests.
 *
 * The setup functions are executed before all the tests
 * The teardown functions are executed after all the tests
 */
export const runnerHooks: Required<Pick<Config, 'setup' | 'teardown'>> = {
  // Migrations run once, before everything. Without this line the schema would only
  // be born as a side effect of `resetDatabase()`'s `truncate()`, and the
  // specs that do not call `resetDatabase` - documentation, messages, multipart and
  // validator - would have no table at all on a freshly created database.
  setup: [() => testUtils.db().migrate()],
  teardown: [],
}

/**
 * Configure suites by tapping into the test suite instance.
 * Learn more - https://japa.dev/docs/test-suites#lifecycle-hooks
 */
export const configureSuite: Config['configureSuite'] = (suite) => {
  if (!['browser', 'functional', 'e2e'].includes(suite.name)) return undefined

  return suite.setup(() => testUtils.httpServer().start())
}
