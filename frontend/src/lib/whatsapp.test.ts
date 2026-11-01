import { describe, expect, it } from 'vitest'

import { whatsappLink } from '#/lib/whatsapp'

describe('whatsappLink', () => {
  it('tira tudo que não é dígito do número', () => {
    expect(whatsappLink('+55 (97) 99999-0001', 'oi')).toBe(
      'https://wa.me/5597999990001?text=oi',
    )
  })

  it('codifica a mensagem, com acento e espaço', () => {
    expect(whatsappLink('5597999990001', 'Olá, vi o anúncio')).toBe(
      'https://wa.me/5597999990001?text=Ol%C3%A1%2C%20vi%20o%20an%C3%BAncio',
    )
  })
})
