// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { describe, expect, it } from 'vitest'

import { applyHTTPErrorToForm } from './form-errors'

type Values = { email: string; name: string }

function renderForm() {
  return renderHook(() => {
    const form = useForm<Values>()
    return { form, errors: form.formState.errors }
  })
}

describe('applyHTTPErrorToForm', () => {
  it('põe cada erro no campo que o formulário conhece', () => {
    const { result } = renderForm()
    let applied: Array<string> = []

    act(() => {
      applied = applyHTTPErrorToForm(result.current.form, ['email', 'name'], {
        fields: { email: 'inválido' },
        general: '',
      })
    })

    expect(applied).toEqual(['email'])
    expect(result.current.errors.email?.message).toBe('inválido')
    expect(result.current.errors.name).toBeUndefined()
  })

  it('manda o campo desconhecido e a mensagem geral para root', () => {
    const { result } = renderForm()
    let applied: Array<string> = []

    act(() => {
      applied = applyHTTPErrorToForm(result.current.form, ['email'], {
        fields: { phone: 'novo' },
        general: 'Falhou.',
      })
    })

    expect(applied).toEqual([])
    expect(result.current.errors.root?.message).toBe('Falhou. novo')
  })

  it('não toca no root sem mensagem', () => {
    const { result } = renderForm()

    act(() => {
      applyHTTPErrorToForm(result.current.form, ['email'], {
        fields: {},
        general: '',
      })
    })

    expect(result.current.errors.root).toBeUndefined()
  })
})
