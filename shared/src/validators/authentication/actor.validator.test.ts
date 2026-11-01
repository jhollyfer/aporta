import { describe, expect, it } from 'vitest'

import { ActorSchema } from './actor.validator.js'
import { USER_ROLE } from '../../enums/user-role.js'

describe('ActorSchema', () => {
  it('when the account has an avatar or not, accepts it', () => {
    const withoutAvatar = ActorSchema.safeParse({
      id: 'a1',
      email: 'ana@exemplo.com',
      role: USER_ROLE.MODERATOR,
      avatarId: null,
    })
    const withAvatar = ActorSchema.safeParse({
      id: 'a1',
      email: 'ana@exemplo.com',
      role: USER_ROLE.ADMINISTRATOR,
      avatarId: 'f1',
    })

    expect(withoutAvatar.success).toBe(true)
    expect(withAvatar.success).toBe(true)
  })

  it('when the role is unknown to the application, rejects it', () => {
    const result = ActorSchema.safeParse({
      id: 'a1',
      email: 'ana@exemplo.com',
      role: 'GUEST',
      avatarId: null,
    })

    expect(result.success).toBe(false)
  })

  it('when the input carries more than the actor, drops the extra fields', () => {
    const result = ActorSchema.safeParse({
      id: 'a1',
      email: 'ana@exemplo.com',
      role: USER_ROLE.MODERATOR,
      avatarId: null,
      password: 'segredo',
    })

    expect(result.data).toEqual({
      id: 'a1',
      email: 'ana@exemplo.com',
      role: USER_ROLE.MODERATOR,
      avatarId: null,
    })
  })
})
