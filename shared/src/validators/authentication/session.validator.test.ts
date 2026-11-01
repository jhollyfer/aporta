import { describe, expect, it } from 'vitest'

import { AuthenticationSessionSignInValidator } from './session.validator.js'
import { ValidationFixture } from '../../validation-fixtures.js'

describe('AuthenticationSessionSignInValidator', () => {
  it('when given email and password, it accepts them, without demanding the password policy', () => {
    const result = AuthenticationSessionSignInValidator.safeParse({
      email: 'ana@exemplo.com',
      password: 'abc',
    })

    expect(result.success).toBe(true)
  })

  it('when the email is invalid and the password absent, it refuses them, in Portuguese', () => {
    const result = AuthenticationSessionSignInValidator.safeParse({
      email: 'ana',
    })

    expect(ValidationFixture.messages(result)).toEqual([
      { field: 'email', message: 'Informe um e-mail válido' },
      { field: 'password', message: 'Informe a senha' },
    ])
  })

  it('when the password is blank, it treats it as absent', () => {
    const result = AuthenticationSessionSignInValidator.safeParse({
      email: 'ana@exemplo.com',
      password: '',
    })

    expect(ValidationFixture.messages(result)).toEqual([
      { field: 'password', message: 'Informe a senha' },
    ])
  })
})
