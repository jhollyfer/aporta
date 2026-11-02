import { isNotFound } from '@tanstack/react-router'
import { describe, expect, it } from 'vitest'

import { loadOrNotFound } from './load-or-not-found'

import {
  HTTPError,
  HTTP_ERROR_CODE,
  HTTP_STATUS,
} from '#/integrations/tanstack-query/http'

function httpError(status: number, code: string): HTTPError {
  return new HTTPError({ message: 'falha', status, code })
}

async function rejectionOf(load: () => Promise<unknown>): Promise<unknown> {
  try {
    await load()
  } catch (error) {
    return error
  }

  return undefined
}

describe('loadOrNotFound', () => {
  it('quando o loader resolve, devolve o dado', async () => {
    await expect(
      loadOrNotFound(
        () => Promise.resolve(42),
        HTTP_ERROR_CODE.LISTING_NOT_FOUND,
      ),
    ).resolves.toBe(42)
  })

  it('quando a API responde o code de recurso ausente, vira notFound()', async () => {
    const error = await rejectionOf(() =>
      loadOrNotFound(
        () =>
          Promise.reject(
            httpError(HTTP_STATUS.NOT_FOUND, HTTP_ERROR_CODE.LISTING_NOT_FOUND),
          ),
        HTTP_ERROR_CODE.LISTING_NOT_FOUND,
      ),
    )

    expect(isNotFound(error)).toBe(true)
  })

  it.each([
    [HTTP_STATUS.NOT_FOUND, HTTP_ERROR_CODE.UNKNOWN_ERROR],
    [HTTP_STATUS.INTERNAL_SERVER_ERROR, HTTP_ERROR_CODE.UNKNOWN_ERROR],
    [HTTP_STATUS.NETWORK, HTTP_ERROR_CODE.NETWORK_ERROR],
  ])(
    'quando o status é %i com outro code, relança sem virar 404',
    async (status, code) => {
      const original = httpError(status, code)
      const error = await rejectionOf(() =>
        loadOrNotFound(
          () => Promise.reject(original),
          HTTP_ERROR_CODE.LISTING_NOT_FOUND,
        ),
      )

      expect(error).toBe(original)
      expect(isNotFound(error)).toBe(false)
    },
  )

  it('quando o erro vem de fora da API, relança', async () => {
    const original = new Error('boom')
    const error = await rejectionOf(() =>
      loadOrNotFound(
        () => Promise.reject(original),
        HTTP_ERROR_CODE.LISTING_NOT_FOUND,
      ),
    )

    expect(error).toBe(original)
  })
})
