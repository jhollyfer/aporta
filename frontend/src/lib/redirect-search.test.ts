import { expect, test } from 'vitest'

import { redirectDestination, validateRedirectSearch } from './redirect-search'

test('quando o destino é um caminho interno, aceita', () => {
  expect(validateRedirectSearch({ redirect: '/account' })).toEqual({
    redirect: '/account',
  })
  expect(
    validateRedirectSearch({ redirect: '/listings?type=ROOM&page=2#topo' }),
  ).toEqual({ redirect: '/listings?type=ROOM&page=2#topo' })
})

test('quando o destino é externo, recusa', () => {
  // Cada um destes leva a pessoa para fora logo depois de digitar a senha.
  const attacks = [
    'https://evil.test',
    'http://evil.test',
    '//evil.test',
    '/\\evil.test',
    '/\t/evil.test',
    '/\n/evil.test',
    'javascript:alert(1)',
    'evil.test',
    '',
  ]

  for (const redirect of attacks) {
    // `toStrictEqual`: a chave tem de existir e valer `undefined`. Sem ela, a mescla com o search
    // bruto da URL devolve o destino malicioso (ver `REFUSED` em `redirect-search.ts`).
    expect(validateRedirectSearch({ redirect })).toStrictEqual({
      redirect: undefined,
    })
  }
})

test('quando o valor não é texto, ignora', () => {
  const refused = { redirect: undefined }

  expect(validateRedirectSearch({})).toStrictEqual(refused)
  expect(validateRedirectSearch({ redirect: 42 })).toStrictEqual(refused)
  expect(validateRedirectSearch({ redirect: ['/account'] })).toStrictEqual(
    refused,
  )
  expect(validateRedirectSearch({ redirect: null })).toStrictEqual(refused)
})

test('quando não há redirect, o destino é a conta', () => {
  expect(redirectDestination({})).toBe('/account')
  expect(redirectDestination({ redirect: '/listings?page=2' })).toBe(
    '/listings?page=2',
  )
})
