import { describe, expect, it } from 'vitest'

import { HTTPError } from '#/integrations/tanstack-query/http'

import { describePlaceFailure } from './place-failure'

function failure(
  status: number,
  code: string,
  errors?: Record<string, string>,
): HTTPError {
  return new HTTPError({ message: 'falha', status, code, errors })
}

describe('describePlaceFailure', () => {
  it('aponta a recusa de data para o campo da data', () => {
    const described = describePlaceFailure(
      failure(422, 'PLACE_EVENT_DATE_REQUIRED'),
    )

    expect(Object.keys(described.fields)).toEqual(['date'])
    expect(described.general).toBe('')
  })

  it('aponta bairro inexistente para o campo do bairro', () => {
    const described = describePlaceFailure(
      failure(422, 'NEIGHBORHOOD_NOT_FOUND'),
    )

    expect(Object.keys(described.fields)).toEqual(['neighborhood'])
  })

  it('leva o `errors` da validação aos campos que ele nomeia', () => {
    const described = describePlaceFailure(
      failure(422, 'VALIDATION_ERROR', { name: 'curto', hours: 'vazio' }),
    )

    expect(described.fields).toEqual({ name: 'curto', hours: 'vazio' })
  })

  it('o que não é de campo vira mensagem geral', () => {
    const missing = describePlaceFailure(failure(404, 'PLACE_NOT_FOUND'))
    const forbidden = describePlaceFailure(failure(403, 'FORBIDDEN'))

    expect(missing.fields).toEqual({})
    expect(missing.general).not.toBe('')
    expect(forbidden.general).not.toBe('')
  })
})
