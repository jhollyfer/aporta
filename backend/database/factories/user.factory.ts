import factory from '@adonisjs/lucid/factories'
import { ACTIVE_STATUS, USER_ROLE } from '@aporta/shared'

import User from '#models/user'

/**
 * Password of every user created by factory. It passes the `password()` policy
 * (`#core/validator`): 8-32 characters, with lowercase, uppercase,
 * digit and symbol - so it works to really sign in through
 * `POST /authentication/sign-in`.
 *
 * It goes in plain text: the `withAuthFinder` mixin in `app/models/user.ts` hashes on
 * save. Passing the hash here would generate a hash of a hash and no login would work.
 */
export const FACTORY_PASSWORD = 'Demo1234!'

/**
 * User. The default role is `OWNER` because it is the least privileged -
 * a test that needs staff asks for the state, and none gains
 * privilege by forgetfulness.
 */
export const UserFactory = factory
  .define(User, ({ faker }) => ({
    name: faker.person.fullName(),
    email: faker.internet.email().toLowerCase(),
    password: FACTORY_PASSWORD,
    role: USER_ROLE.OWNER,
    status: ACTIVE_STATUS.ACTIVE,
  }))
  .state('administrator', (user) => (user.role = USER_ROLE.ADMINISTRATOR))
  .state('moderator', (user) => (user.role = USER_ROLE.MODERATOR))
  .state('inactive', (user) => (user.status = ACTIVE_STATUS.INACTIVE))
  .build()
