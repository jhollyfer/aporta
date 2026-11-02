import { describe, expect, it } from 'vitest'

import {
  AuthenticationSessionSignInValidator,
  AuthenticationSessionSignUpValidator,
} from './session.validator.js'
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

const SIGN_UP = {
  name: 'Seu Raimundo',
  email: 'raimundo@example.com',
  password: 'Senha#2026ok',
  passwordConfirmation: 'Senha#2026ok',
}

describe('AuthenticationSessionSignUpValidator', () => {
  it('aceita um cadastro completo', () => {
    expect(
      AuthenticationSessionSignUpValidator.safeParse(SIGN_UP).success,
    ).toBe(true)
  })

  it('recusa a confirmação diferente, apontando o campo da confirmação', () => {
    const result = AuthenticationSessionSignUpValidator.safeParse({
      ...SIGN_UP,
      passwordConfirmation: 'Outra#2026ok',
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['passwordConfirmation'])
  })

  it('recusa senha fraca', () => {
    expect(
      AuthenticationSessionSignUpValidator.safeParse({
        ...SIGN_UP,
        password: 'senhafraca',
        passwordConfirmation: 'senhafraca',
      }).success,
    ).toBe(false)
  })

  it('não deixa o cliente escolher o papel: a chave não sai no resultado', () => {
    const result = AuthenticationSessionSignUpValidator.safeParse({
      ...SIGN_UP,
      role: 'ADMINISTRATOR',
    })

    expect(result.success).toBe(true)
    expect(result.data).not.toHaveProperty('role')
  })
})
