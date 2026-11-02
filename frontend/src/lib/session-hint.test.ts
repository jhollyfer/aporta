// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import {
  clearSessionHint,
  hasSessionHint,
  markSessionHint,
  subscribeSessionHint,
} from './session-hint'

beforeEach(() => {
  window.localStorage.clear()
  clearSessionHint()
})

afterEach(() => {
  vi.restoreAllMocks()
})

test('quando ninguém entrou, não há dica', () => {
  expect(hasSessionHint()).toBe(false)
})

test('quando a pessoa entra, a dica liga e fica no storage', () => {
  markSessionHint()

  expect(hasSessionHint()).toBe(true)
  expect(window.localStorage.getItem('aporta:session:v1')).toBe('1')
})

test('quando a pessoa sai, a dica apaga do storage', () => {
  markSessionHint()
  clearSessionHint()

  expect(hasSessionHint()).toBe(false)
  expect(window.localStorage.getItem('aporta:session:v1')).toBeNull()
})

test('quando muda a dica, avisa quem assinou, e para de avisar quem cancelou', () => {
  const listener = vi.fn()
  const unsubscribe = subscribeSessionHint(listener)

  markSessionHint()
  expect(listener).toHaveBeenCalledTimes(1)

  unsubscribe()
  clearSessionHint()
  expect(listener).toHaveBeenCalledTimes(1)
})

test('quando o storage está bloqueado, a dica vive na memória da aba', () => {
  // Janela privada e dados bloqueados fazem o storage lançar. Sem a cópia em memória
  // quem entra nesse navegador nunca passaria do portão.
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('bloqueado')
  })
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('bloqueado')
  })

  markSessionHint()

  expect(hasSessionHint()).toBe(true)
})

test('quando outra aba muda o storage, a dica volta a valer o que o storage diz', () => {
  markSessionHint()
  const listener = vi.fn()
  const unsubscribe = subscribeSessionHint(listener)

  // A outra aba saiu: o storage perdeu a chave e esta aba só fica sabendo pelo evento.
  window.localStorage.removeItem('aporta:session:v1')
  window.dispatchEvent(
    new StorageEvent('storage', { key: 'aporta:session:v1', newValue: null }),
  )

  expect(listener).toHaveBeenCalledTimes(1)
  expect(hasSessionHint()).toBe(false)

  unsubscribe()
})
