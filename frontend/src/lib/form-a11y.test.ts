import { describe, expect, it } from 'vitest'

import { errorId, hintId, invalidProps } from './form-a11y'

describe('form-a11y', () => {
  it('deriva os ids do nome do campo', () => {
    expect(errorId('email')).toBe('email-error')
    expect(hintId('email')).toBe('email-hint')
  })

  it('aponta o controle inválido para o erro', () => {
    expect(invalidProps(true, 'email')).toEqual({
      'aria-invalid': true,
      'aria-describedby': 'email-error',
    })
  })

  it('não aponta nada quando o campo é válido', () => {
    expect(invalidProps(false, 'email')).toEqual({
      'aria-invalid': false,
      'aria-describedby': undefined,
    })
  })
})
