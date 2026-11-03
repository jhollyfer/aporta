import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { DEFAULT_OG_IMAGE, pageHead } from './page-head'

const PUBLIC_DIR = resolve(import.meta.dirname, '../../public')

describe('prévia de link', () => {
  it('toda imagem que o head aponta existe em public/', () => {
    expect(
      existsSync(resolve(PUBLIC_DIR, DEFAULT_OG_IMAGE.slice(1))),
      DEFAULT_OG_IMAGE,
    ).toBe(true)
  })

  it('a página que traz imagem própria a põe absoluta no og e no twitter', () => {
    const { meta } = pageHead({
      path: '/listings/kitnet',
      title: 'Kitnet',
      description: 'Perto do porto.',
      image: '/og-custom.png',
    })
    const og = meta.find((entry) => entry['property'] === 'og:image')
    const twitter = meta.find((entry) => entry['name'] === 'twitter:image')

    expect(og?.['content']).toMatch(/^https?:\/\/.+\/og-custom\.png$/)
    expect(twitter?.['content']).toBe(og?.['content'])
  })

  it('sem imagem própria, o head da página não toca na padrão do site', () => {
    const { meta } = pageHead({
      path: '/guide',
      title: 'Guia',
      description: 'A cidade.',
    })

    expect(meta.some((entry) => entry['property'] === 'og:image')).toBe(false)
  })
})
