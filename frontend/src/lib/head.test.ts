import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { DEFAULT_OG_IMAGE, OG_IMAGE_BY_TYPE, pageHead } from './head'

const PUBLIC_DIR = resolve(import.meta.dirname, '../../public')

describe('prévia de link', () => {
  it('toda imagem que o head aponta existe em public/', () => {
    const files = new Set([
      DEFAULT_OG_IMAGE,
      ...Object.values(OG_IMAGE_BY_TYPE),
    ])

    for (const file of files) {
      expect(existsSync(resolve(PUBLIC_DIR, file.slice(1))), file).toBe(true)
    }
  })

  it('a página que traz imagem própria a põe absoluta no og e no twitter', () => {
    const { meta } = pageHead({
      path: '/listings/kitnet',
      title: 'Kitnet',
      description: 'Perto do porto.',
      image: OG_IMAGE_BY_TYPE.KITNET,
    })
    const og = meta.find((entry) => entry['property'] === 'og:image')
    const twitter = meta.find((entry) => entry['name'] === 'twitter:image')

    expect(og?.['content']).toMatch(/^https?:\/\/.+\/og-building\.png$/)
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
