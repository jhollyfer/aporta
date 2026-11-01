import { defineConfig, syncDestination, targets } from '@adonisjs/core/logger'
import app from '@adonisjs/core/services/app'

import env from '#start/env'

/**
 * The synchronous destination, only outside production.
 *
 * Computed with an `if` before the literal (`typescript.md` §13): in production there is no
 * destination to build, and `syncDestination()` is asynchronous - the ternary forced an
 * `await` inside the configuration literal for a value that half the environments discard.
 */
let developmentDestination: Awaited<ReturnType<typeof syncDestination>>
if (!app.inProduction) developmentDestination = await syncDestination()

const loggerConfig = defineConfig({
  /**
   * Default logger name used by ctx.logger and app logger calls.
   */
  default: 'app',

  loggers: {
    app: {
      /**
       * Toggle this logger on/off.
       */
      enabled: true,

      /**
       * The name that appears in each log record: the `name` from `package.json`,
       * which Adonis exposes in `app.appName`. Neither a literal in the code nor an environment
       * variable: the name belongs to the application, and does not change from environment to environment.
       */
      name: String(app.appName),

      /**
       * Minimum level to output (trace, debug, info, warn, error, fatal).
       */
      level: env.get('LOG_LEVEL'),

      /**
       * What never goes out in the log, even if someone passes the whole object.
       *
       * Today nothing here logs body, header or cookie — the use-cases'
       * `logger.error({ err })` carries only the error. This list does not fix an
       * existing leak: it is the net for the first `logger.info({ payload })` that
       * someone writes, which is when the leak is born in silence.
       *
       * Explicit `censor` so the field appears redacted instead of vanishing: an absent
       * field reads as "did not come", and not as "was hidden".
       */
      redact: {
        paths: [
          'password',
          'currentPassword',
          'passwordConfirmation',
          '*.password',
          '*.currentPassword',
          'token',
          'accessToken',
          'refreshToken',
          '*.token',
          'authorization',
          'cookie',
          'req.headers.authorization',
          'req.headers.cookie',
          'headers.authorization',
          'headers.cookie',
        ],
        censor: '[redigido]',
      },

      /**
       * Use sync destination in non-production for immediate flush.
       */
      destination: developmentDestination,

      /**
       * Configure where logs are written.
       */
      transport: {
        targets: [targets.file({ destination: 1 })],
      },
    },
  },
})

export default loggerConfig

/**
 * Inferring types for the list of loggers you have configured
 * in your application.
 */
declare module '@adonisjs/core/types' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-empty-object-type -- declaration merging requires `interface`, which adds no members here
  export interface LoggersList extends InferLoggers<typeof loggerConfig> {}
}
