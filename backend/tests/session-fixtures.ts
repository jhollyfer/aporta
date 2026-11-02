import type { ApiClient } from '@japa/api-client'

import { COOKIE_TOKEN } from '#config/session-token'
import { FACTORY_PASSWORD, UserFactory } from '#database/factories/user.factory'
import env from '#start/env'

/**
 * The password the seeder saved: `SEED_OWNER_PASSWORD` from `.env.test`, the same one
 * that `database/seeders/user.seed.ts` reads. Without it the test fails here, with the
 * variable name, and not in a sign-in 401.
 */
function seedOwnerPassword(): string {
  const password = env.get('SEED_OWNER_PASSWORD')
  if (!password) throw new Error('SEED_OWNER_PASSWORD missing from .env.test')

  return password
}

/** The e-mail the seeder saved: `SEED_OWNER_EMAIL` from `.env.test`. */
function seedOwnerEmail(): string {
  const email = env.get('SEED_OWNER_EMAIL')
  if (!email) throw new Error('SEED_OWNER_EMAIL missing from .env.test')

  return email
}

/**
 * The seeder administrator. It is the only account that no endpoint creates without a
 * session, so every test that needs a session starts with it.
 */
export const ADMINISTRATOR = {
  email: seedOwnerEmail(),
  password: seedOwnerPassword(),
} as const satisfies { readonly email: string; readonly password: string }

export type Session = {
  readonly [COOKIE_TOKEN.ACCESS]: string
  readonly [COOKIE_TOKEN.REFRESH]: string
}

/**
 * Authenticates over HTTP and returns the cookies to chain into the following
 * requests.
 *
 * Deliberately does **not** use the auth plugin's `loginAs`, which builds the session
 * by calling the guard from the inside and therefore never exercises the real path:
 * sign-in validator, token pair issuance and cookie reading by the
 * guard. With the real sign-in, a test comes to prove the whole contract.
 */
export async function authenticate(
  client: ApiClient,
  email: string,
  password: string,
): Promise<Session> {
  const response = await client
    .post('/authentication/sign-in')
    .json({ email, password })

  response.assertStatus(204)

  const access = response.cookie(COOKIE_TOKEN.ACCESS)
  const refresh = response.cookie(COOKIE_TOKEN.REFRESH)
  if (!access || !refresh)
    throw new Error('cookie missing from the sign-in response')

  return {
    [COOKIE_TOKEN.ACCESS]: String(access.value),
    [COOKIE_TOKEN.REFRESH]: String(refresh.value),
  }
}

/** Shortcut for the seeder administrator session, which is the most used. */
export function authenticateAsAdministrator(
  client: ApiClient,
): Promise<Session> {
  return authenticate(client, ADMINISTRATOR.email, ADMINISTRATOR.password)
}

/**
 * A session of an account created on the spot by the factory, and not seeded: the seeder
 * exists for the first administrator, who is the only one that no endpoint creates. The
 * other roles are the other side of every permission assertion.
 */
async function authenticateAs(
  client: ApiClient,
  role: 'moderator' | 'owner',
): Promise<Session> {
  const created = {
    moderator: () => UserFactory.apply('moderator').create(),
    owner: () => UserFactory.create(),
  } satisfies Record<typeof role, () => Promise<{ email: string }>>

  const user = await created[role]()

  return authenticate(client, user.email, FACTORY_PASSWORD)
}

/** A moderator session: staff, but not the administrator. */
export function authenticateAsModerator(client: ApiClient): Promise<Session> {
  return authenticateAs(client, 'moderator')
}

/** An owner-of-a-property session: the public that advertises, with no access to the panel. */
export function authenticateAsOwner(client: ApiClient): Promise<Session> {
  return authenticateAs(client, 'owner')
}

/** A moderator's session together with the account, for the specs that assert who decided. */
export async function authenticateAsModeratorAccount(
  client: ApiClient,
): Promise<OwnerAccount> {
  const user = await UserFactory.apply('moderator').create()

  return {
    session: await authenticate(client, user.email, FACTORY_PASSWORD),
    userId: user.id,
  }
}

/** An owner's session together with the account it belongs to, for the specs that assert ownership. */
export type OwnerAccount = {
  readonly session: Session
  readonly userId: string
}

/**
 * A new owner account, signed in. `authenticateAsOwner` hides the account because most specs only
 * need the cookie; the ones about "whose ad is this" need the id to compare with the column.
 */
export async function authenticateAsOwnerAccount(
  client: ApiClient,
): Promise<OwnerAccount> {
  const user = await UserFactory.create()

  return {
    session: await authenticate(client, user.email, FACTORY_PASSWORD),
    userId: user.id,
  }
}
