import { describe, expect, it } from 'vitest'

import { buildSitemap } from '#/lib/sitemap'

describe('buildSitemap', () => {
  it('monta a URL absoluta sem barra dupla', () => {
    const xml = buildSitemap('https://exemplo.test/', [{ path: '/listings' }])
    expect(xml).toContain('<loc>https://exemplo.test/listings</loc>')
  })

  it('escapa o & para não quebrar o documento', () => {
    const xml = buildSitemap('https://exemplo.test', [{ path: '/a?x=1&y=2' }])
    expect(xml).toContain('x=1&amp;y=2')
  })

  it('inclui lastmod e priority quando existem', () => {
    const xml = buildSitemap('https://exemplo.test', [
      { path: '/', lastModified: '2026-11-01', priority: 1 },
    ])
    expect(xml).toContain('<lastmod>2026-11-01</lastmod>')
    expect(xml).toContain('<priority>1.0</priority>')
  })

  it('liga as versões de idioma por xhtml:link', () => {
    const xml = buildSitemap('https://exemplo.test', [
      {
        path: '/en/guide',
        alternates: [
          { hreflang: 'pt-BR', path: '/guide' },
          { hreflang: 'en', path: '/en/guide' },
        ],
      },
    ])
    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"')
    expect(xml).toContain(
      '<xhtml:link rel="alternate" hreflang="en" href="https://exemplo.test/en/guide"/>',
    )
  })
})
