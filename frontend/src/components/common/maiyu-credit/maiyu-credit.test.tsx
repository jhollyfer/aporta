// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { MaiyuCredit } from './index'

afterEach(cleanup)

describe('MaiyuCredit', () => {
  it('abre o link da Maiyu em outra aba sem vazar o opener', () => {
    render(<MaiyuCredit />)
    const link = screen.getByRole('link', { name: 'Maiyu' })

    expect(link.getAttribute('href')).toBe('https://maiyu.com.br')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('mostra só a frase de crédito, com a logo decorativa', () => {
    const { container } = render(<MaiyuCredit />)

    expect(container.textContent).toBe('Desenvolvido por Maiyu')
    expect(container.querySelector('img')?.getAttribute('alt')).toBe('')
  })

  it('aceita uma classe extra no parágrafo', () => {
    const { container } = render(<MaiyuCredit className="extra" />)

    expect(
      container.querySelector('[data-slot="maiyu-credit"]')?.className,
    ).toContain('extra')
  })
})
