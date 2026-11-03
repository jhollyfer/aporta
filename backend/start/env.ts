import { Env } from '@adonisjs/core/env'

import { TrustedProxies } from '#core/trusted-proxies'

/**
 * The single environment reader (`_standards/backend.md` §6). Every key read by
 * `env.get()` is declared here, and every declared key is read by someone -
 * enforced by `pattern:check`. A dead key goes: declared without a reader, it
 * promises a configuration that does not exist.
 *
 * Required is whatever brings down the boot when missing - and bringing down the boot is the
 * desired behavior: better for the application not to start than to start with a
 * default hidden in the code. Secrets and credentials have no default.
 *
 * The blocks follow the standard's order, the same as `.env.example`.
 */
export default await Env.create(new URL('../', import.meta.url), {
  /*
  |----------------------------------------------------------------------------
  | Node
  |----------------------------------------------------------------------------
  |
  | `PORT` and `HOST` are read from `process.env` by the framework itself, and
  | `NODE_ENV` by the loader, before the env service exists. `TZ` is read
  | by Node: when absent, the process inherits the host time zone, and the same query
  | answers different dates depending on the machine. `UTC` in every environment; whoever
  | converts to the reader's time zone is the presentation layer.
  */
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  HOST: Env.schema.string({ format: 'host' }),
  TZ: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------------------------
  | App
  |----------------------------------------------------------------------------
  */
  LOG_LEVEL: Env.schema.string(),
  APP_KEY: Env.schema.secret(),
  APP_SERVER_URL: Env.schema.string({ format: 'url', tld: false }),

  /*
  | The public origin of the web app. Optional because with the app and the API on the same
  | site it changes nothing: it only decides the session cookie `sameSite`
  | (`config/session-token.ts`), `none` when it is on a different site from `APP_SERVER_URL`.
  | Absent falls back to `lax`, never to `none`.
  */
  APP_CLIENT_URL: Env.schema.string.optional({ format: 'url', tld: false }),

  /*
  | The reverse proxies whose `X-Forwarded-For` is trusted: addresses, CIDR
  | ranges and the words `loopback`, `linklocal` and `uniquelocal`, separated by
  | comma (the http-server's `trustProxy`, via proxy-addr). Optional because
  | with no proxy in front the right value is none; when absent only `loopback` holds, the
  | framework's own default. Never `true`: the client would forge the IP, and with
  | it the key of every limit.
  */
  TRUSTED_PROXIES: TrustedProxies.validate,

  /*
  |----------------------------------------------------------------------------
  | Session
  |----------------------------------------------------------------------------
  |
  | `COOKIE_DOMAIN` is the session cookie domain, when the app and the API are
  | on different hosts of the same parent domain. Without it the cookie is born host-only and
  | the frontend SSR never receives it: every F5 on a private route becomes 401. In
  | development it does not show up because cookies ignore ports. Optional because
  | empty is the right value when both are on the same host.
  */
  COOKIE_DOMAIN: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------------------------
  | CORS
  |----------------------------------------------------------------------------
  |
  | Origins the browser may use to call this API, separated by
  | comma. Optional because in development `config/cors.ts` allows everything;
  | outside it, absent means an empty list, and an empty list refuses every
  | cross-origin request - the right default for a value nobody configured.
  */
  CORS_ORIGINS: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------------------------
  | Database
  |----------------------------------------------------------------------------
  |
  | `DATABASE_SSL` absent means **TLS off**: the database connection
  | goes out in clear text. It is the default because a database on the same private network as the
  | application normally does not speak TLS; a managed database, outside it, requires
  | `true`. The decision is about where the database is, not `NODE_ENV`.
  */
  DATABASE_URL: Env.schema.string(),
  DATABASE_SSL: Env.schema.boolean.optional(),

  /*
  |----------------------------------------------------------------------------
  | Storage
  |----------------------------------------------------------------------------
  |
  | An S3-compatible bucket, the same in every environment: the upload is presigned
  | multipart, and multipart is an S3 API - a local disk does not have it. The prefix is
  | `STORAGE_`, and not a vendor name: what the code depends on is the
  | protocol, and vendors swap places by changing the endpoint.
  |
  | Credential and bucket are required: without them the upload would fail on the first
  | request, with an empty bucket in place of the name. `UPLOAD_MAX_SIZE` is the ceiling
  | per file, in bytes, and is also required: how much fits in an upload is
  | the operator's decision, and a default in the code would be a ceiling nobody
  | chose.
  */
  UPLOAD_MAX_SIZE: Env.schema.number(),
  STORAGE_KEY: Env.schema.string(),
  STORAGE_SECRET: Env.schema.string(),
  STORAGE_BUCKET: Env.schema.string(),
  STORAGE_ENDPOINT: Env.schema.string({ format: 'url', tld: false }),
  STORAGE_FORCE_PATH_STYLE: Env.schema.boolean.optional(),

  /*
  |----------------------------------------------------------------------------
  | Seeding
  |----------------------------------------------------------------------------
  |
  | Each seed is switched on by its key having a value, in any environment, and the application
  | boots without them - only whoever seeds needs them. Empty skips that seed with one log line,
  | and never throws: no password lives in the code, and the seeder does not invent one.
  | `SEED_OWNER_*` is the first administrator (the pair goes together: a password without an
  | e-mail stops the seeder); `SEED_DEMO_PASSWORD` is the shared password of the demo accounts
  | and the switch of the sample content.
  */
  SEED_OWNER_EMAIL: Env.schema.string.optional(),
  SEED_OWNER_PASSWORD: Env.schema.string.optional(),
  SEED_DEMO_PASSWORD: Env.schema.string.optional(),
})
