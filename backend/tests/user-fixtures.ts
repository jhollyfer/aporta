import { randomUUID } from 'node:crypto'

import { USER_ROLE, type Actor } from '@aporta/shared'

import User, { type UserCreateInput } from '#domain/user/user.entity'

/**
 * The user creation payload, which the `administrator/users` specs
 * (`create` and the complete journey in `delete`) and the role matrix
 * (`app/middleware/role.middleware.e2e.spec.ts`) send.
 *
 * `passwordConfirmation` accompanies the password because the shared strength rule
 * requires `confirmed` - the field is read from the raw input and does not reach the
 * database.
 */
export const userPayload = {
  name: 'Nova Pessoa',
  email: 'nova.pessoa@mail.com',
  password: 'Demo1234!',
  passwordConfirmation: 'Demo1234!',
  role: USER_ROLE.OWNER,
}

/** The default account without a database, for the entity spec, the contract and the unit tests. */
export const USER_INPUT = {
  name: 'Ana',
  email: 'ana@mail.com',
  password: 'Demo1234!',
  role: USER_ROLE.OWNER,
} as const

/** An account with a unique email per call, unless the spec asks for one. */
export function userDraft(input: Partial<UserCreateInput> = {}): User {
  const id = randomUUID()
  return User.create({ id, ...USER_INPUT, email: `${id}@mail.com`, ...input })
}

/** The `actor` of whoever acts, without a database: what the authentication middleware builds. */
export function actorDraft(input: Partial<Actor> = {}): Actor {
  return {
    id: randomUUID(),
    email: USER_INPUT.email,
    role: USER_ROLE.OWNER,
    avatarId: null,
    ...input,
  }
}
