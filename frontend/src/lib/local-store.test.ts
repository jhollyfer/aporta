// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'

import { LocalStore } from './local-store'

function parseCount(raw: unknown): number {
  if (typeof raw === 'number') return raw

  return 0
}

describe('LocalStore', () => {
  const store = new LocalStore({
    theme: 'teste',
    version: 1,
    parse: parseCount,
    fallback: -1,
  })

  beforeEach(() => {
    window.localStorage.clear()
  })

  it('when composing, it builds the versioned key', () => {
    expect(store.keyOf('a')).toBe('aporta:teste:v1:a')
  })

  it('when nothing is saved, it returns the fallback', () => {
    expect(store.read('a')).toBe(-1)
  })

  it('when writing, it saves and reads through the parse', () => {
    store.write('a', 7)

    expect(window.localStorage.getItem('aporta:teste:v1:a')).toBe('7')
    expect(store.read('a')).toBe(7)
  })

  it('when the JSON is corrupted, it returns the fallback', () => {
    window.localStorage.setItem('aporta:teste:v1:a', '{nao-e-json')

    expect(store.read('a')).toBe(-1)
  })

  it('when the version is new, it ignores what the old one stored', () => {
    window.localStorage.setItem('aporta:teste:v0:a', '9')

    expect(store.read('a')).toBe(-1)
  })

  it('when matching a key, it recognizes only its own topic and version', () => {
    expect(store.idOf('aporta:teste:v1:x:y')).toBe('x:y')
    expect(store.idOf('aporta:outro:v1:x')).toBeNull()
    expect(store.idOf(null)).toBeNull()
  })

  it('when removing, it deletes only that id', () => {
    store.write('a', 1)
    store.write('b', 2)

    store.remove('a')

    expect(store.read('a')).toBe(-1)
    expect(store.read('b')).toBe(2)
  })

  it('when listing ids, it returns only the ones of its own topic and version', () => {
    store.write('a', 1)
    store.write('x:y', 2)
    window.localStorage.setItem('aporta:teste:v0:old', '9')
    window.localStorage.setItem('aporta:outro:v1:z', '9')
    window.localStorage.setItem('theme', 'dark')

    expect(store.ids().sort()).toEqual(['a', 'x:y'])
  })
})
