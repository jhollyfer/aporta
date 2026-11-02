import { z } from 'zod'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import {
  HTTPError,
  HTTP_ERROR_CODE,
  WITH_SESSION,
  request,
  requestVoid,
} from './http'

const OK = z.object({ ok: z.boolean() })

function json(status: number, body: unknown, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

const UNAUTHORIZED = {
  message: 'Não autorizado',
  status: 401,
  code: 'UNAUTHORIZED',
}

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  // A renovação é só do navegador (`canRenew`); no ambiente `node` o Vitest marca SSR.
  vi.stubEnv('SSR', false)
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

function calls(): Array<string> {
  return fetchMock.mock.calls.map(([url]) => new URL(String(url)).pathname)
}

test('quando a rota é pública, o pedido sai sem credencial', async () => {
  fetchMock.mockResolvedValueOnce(json(200, { ok: true }))

  await request(OK, '/storefront/listings')

  expect(fetchMock.mock.calls[0]?.[1]?.credentials).toBeUndefined()
})

test('quando a rota é autenticada, o pedido leva a credencial', async () => {
  fetchMock.mockResolvedValueOnce(json(200, { ok: true }))

  await request(OK, '/account', WITH_SESSION)

  expect(fetchMock.mock.calls[0]?.[1]?.credentials).toBe('include')
})

test('quando a sessão venceu, renova uma vez e repete o pedido', async () => {
  fetchMock
    .mockResolvedValueOnce(json(401, UNAUTHORIZED))
    .mockResolvedValueOnce(new Response(null, { status: 200 }))
    .mockResolvedValueOnce(json(200, { ok: true }))

  const body = await request(OK, '/account', WITH_SESSION)

  expect(body).toEqual({ ok: true })
  expect(calls()).toEqual(['/account', '/authentication/refresh', '/account'])
})

test('quando a renovação também falha, o erro dela sobe e não há terceira tentativa', async () => {
  fetchMock
    .mockResolvedValueOnce(json(401, UNAUTHORIZED))
    .mockResolvedValueOnce(json(401, UNAUTHORIZED))

  await expect(request(OK, '/account', WITH_SESSION)).rejects.toMatchObject({
    status: 401,
    code: HTTP_ERROR_CODE.UNAUTHORIZED,
  })
  expect(calls()).toEqual(['/account', '/authentication/refresh'])
})

test('quando a credencial é errada no sign-in, não renova', async () => {
  fetchMock.mockResolvedValueOnce(
    json(401, {
      message: 'Credenciais inválidas',
      status: 401,
      code: 'INVALID_CREDENTIALS',
    }),
  )

  await expect(
    requestVoid('/authentication/sign-in', {
      method: 'POST',
      body: '{}',
      ...WITH_SESSION,
    }),
  ).rejects.toMatchObject({ code: HTTP_ERROR_CODE.INVALID_CREDENTIALS })
  expect(calls()).toEqual(['/authentication/sign-in'])
})

test('quando a rota pública responde 401, não renova', async () => {
  fetchMock.mockResolvedValueOnce(json(401, UNAUTHORIZED))

  await expect(request(OK, '/storefront/listings')).rejects.toBeInstanceOf(
    HTTPError,
  )
  expect(calls()).toEqual(['/storefront/listings'])
})

test('quando dois pedidos tomam 401 juntos, a renovação acontece uma vez só', async () => {
  fetchMock.mockImplementation((input) => {
    const path = new URL(String(input)).pathname
    const hits = calls().filter((each) => each === path).length

    if (path === '/authentication/refresh') {
      return Promise.resolve(new Response(null, { status: 200 }))
    }

    // O primeiro pedido de cada rota vence a corrida e leva 401; o replay passa.
    if (hits === 1) return Promise.resolve(json(401, UNAUTHORIZED))

    return Promise.resolve(json(200, { ok: true }))
  })

  await Promise.all([
    request(OK, '/account', WITH_SESSION),
    request(OK, '/other', WITH_SESSION),
  ])

  expect(calls().filter((p) => p === '/authentication/refresh')).toHaveLength(1)
})

test('quando o limite estoura, o HTTPError carrega o Retry-After em segundos', async () => {
  fetchMock.mockResolvedValueOnce(
    json(
      429,
      {
        message: 'Tentativas em excesso',
        status: 429,
        code: 'TOO_MANY_REQUESTS',
      },
      { 'Retry-After': '120' },
    ),
  )

  await expect(
    requestVoid('/authentication/sign-in', { method: 'POST', ...WITH_SESSION }),
  ).rejects.toMatchObject({ status: 429, retryAfter: 120 })
})

test('quando o 429 vem sem Retry-After legível, retryAfter fica indefinido', async () => {
  fetchMock.mockResolvedValueOnce(
    json(
      429,
      {
        message: 'Tentativas em excesso',
        status: 429,
        code: 'TOO_MANY_REQUESTS',
      },
      { 'Retry-After': 'Wed, 21 Oct 2026 07:28:00 GMT' },
    ),
  )

  await expect(
    requestVoid('/authentication/sign-in', { method: 'POST', ...WITH_SESSION }),
  ).rejects.toMatchObject({ status: 429, retryAfter: undefined })
})
