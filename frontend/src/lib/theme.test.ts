// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'

import {
  THEME_STORAGE_KEY,
  applyTheme,
  nextTheme,
  readTheme,
  toTheme,
} from '#/lib/theme'

describe('tema', () => {
  beforeEach(() => {
    window.localStorage.clear()
    delete window.document.documentElement.dataset['theme']
  })

  it('o botão gira entre automático, claro e escuro', () => {
    expect(nextTheme('system')).toBe('light')
    expect(nextTheme('light')).toBe('dark')
    expect(nextTheme('dark')).toBe('system')
  })

  it('valor guardado desconhecido vale automático', () => {
    expect(toTheme('roxo')).toBe('system')
    expect(toTheme(null)).toBe('system')
    expect(toTheme('dark')).toBe('dark')
  })

  it('aplica o escuro no html e guarda a escolha', () => {
    applyTheme('dark')

    expect(window.document.documentElement.dataset['theme']).toBe('dark')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(readTheme()).toBe('dark')
  })

  it('voltar ao automático tira o atributo e esquece a escolha', () => {
    applyTheme('light')
    applyTheme('system')

    expect(window.document.documentElement.dataset['theme']).toBeUndefined()
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
  })
})
