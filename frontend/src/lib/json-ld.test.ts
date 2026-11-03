import { describe, expect, it } from 'vitest'

import { breadcrumbJsonLd, jsonLdScript, organizationJsonLd } from './json-ld'

describe('json-ld', () => {
  it('escapa o < para o JSON não fechar a tag script', () => {
    const { type, children } = jsonLdScript({ name: '</script><b>' })

    expect(type).toBe('application/ld+json')
    expect(children).not.toContain('<')
    expect(children).toContain('\\u003c/script>')
  })

  it('numera a trilha a partir de 1', () => {
    const data = breadcrumbJsonLd([
      { name: 'Imóveis', path: '/listings' },
      { name: 'Casa', path: '/listings/casa' },
    ])

    expect(JSON.stringify(data)).toContain('"position":2')
  })

  it('declara a organização', () => {
    expect(organizationJsonLd()['@type']).toBe('Organization')
  })
})
