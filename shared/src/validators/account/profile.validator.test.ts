import { describe, expect, it } from 'vitest'

import { AccountProfileUpdateValidator } from './profile.validator.js'
import { ValidationFixture } from '../../validation-fixtures.js'

describe('AccountProfileUpdateValidator', () => {
  // The verb promises partial and the schema has to accept partial.
  it('when given a partial payload, it accepts it', () => {
    const result = AccountProfileUpdateValidator.safeParse({
      name: 'Ana Paula',
    })

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ name: 'Ana Paula' })
  })

  it('when the new password comes along, it requires the current password', () => {
    const result = AccountProfileUpdateValidator.safeParse({
      password: 'Senha@123',
      passwordConfirmation: 'Senha@123',
    })

    expect(ValidationFixture.messages(result)).toContainEqual({
      field: 'currentPassword',
      message: 'Informe a senha atual',
    })
  })

  /**
   * The deviation that VineJS imposed is gone: there `requiredIfExists` looked at the
   * **key**, and `password: ''` started requiring the current password. Here a blank
   * password counts as absent - it is "do not change" - and leaves the payload.
   */
  it('when the password is blank, it treats it as absent and does not demand the current password', () => {
    const result = AccountProfileUpdateValidator.safeParse({
      name: 'Ana',
      password: '',
      passwordConfirmation: '',
    })

    expect(result.success).toBe(true)
    expect(result.data?.password).toBeUndefined()
  })

  it('when the confirmation differs, it refuses it and points at the confirmation', () => {
    const result = AccountProfileUpdateValidator.safeParse({
      password: 'Senha@123',
      passwordConfirmation: 'Senha@124',
      currentPassword: 'Antiga@123',
    })

    expect(ValidationFixture.messages(result)).toEqual([
      { field: 'passwordConfirmation', message: 'As senhas não são iguais' },
    ])
  })

  it('when the password lacks the four character classes, it refuses it', () => {
    const result = AccountProfileUpdateValidator.safeParse({
      password: 'senhasenha',
      passwordConfirmation: 'senhasenha',
      currentPassword: 'Antiga@123',
    })

    expect(ValidationFixture.messages(result)).toContainEqual({
      field: 'password',
      message:
        'A senha precisa de letra minúscula, maiúscula, número e caractere especial',
    })
  })

  // `nullable` is what allows removing the photo without replacing it.
  it('when avatarId is null, it accepts it', () => {
    const result = AccountProfileUpdateValidator.safeParse({ avatarId: null })

    expect(result.success).toBe(true)
    expect(result.data?.avatarId).toBeNull()
  })
})
