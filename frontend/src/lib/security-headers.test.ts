import { describe, expect, it } from 'vitest'

import {
  SECURITY_HEADERS,
  buildContentSecurityPolicy,
  staticHeaders,
} from './security-headers'

function directive(policy: string, name: string): string {
  const found = policy.split('; ').find((item) => item.startsWith(`${name} `))

  return found ?? ''
}

describe('buildContentSecurityPolicy', () => {
  const policy = buildContentSecurityPolicy({
    nonce: 'abc123',
    apiOrigin: 'https://api.exemplo.test',
    storageOrigin: 'https://bucket.exemplo.test',
  })

  it('só executa script próprio ou com o nonce da resposta, sem unsafe-inline', () => {
    expect(directive(policy, 'script-src')).toBe(
      "script-src 'self' 'nonce-abc123'",
    )
    expect(directive(policy, 'script-src')).not.toContain('unsafe')
  })

  it('libera a API e o bucket para o fetch e o envio em partes', () => {
    expect(directive(policy, 'connect-src')).toBe(
      "connect-src 'self' https://api.exemplo.test https://bucket.exemplo.test",
    )
  })

  it('libera os ladrilhos do mapa, o domínio puro e o curinga, e o bucket nas imagens', () => {
    const images = directive(policy, 'img-src')

    expect(images).toContain(' https://tile.openstreetmap.org ')
    expect(images).toContain('https://*.tile.openstreetmap.org')
    expect(images).toContain('https://bucket.exemplo.test')
  })

  it('não deixa embutir o site em outro nem trocar a base dos links', () => {
    expect(directive(policy, 'frame-ancestors')).toBe("frame-ancestors 'none'")
    expect(directive(policy, 'base-uri')).toBe("base-uri 'self'")
    expect(directive(policy, 'form-action')).toBe("form-action 'self'")
    expect(directive(policy, 'object-src')).toBe("object-src 'none'")
  })

  it('sem bucket conhecido, a política não o menciona', () => {
    const without = buildContentSecurityPolicy({
      nonce: 'x',
      apiOrigin: 'https://api.exemplo.test',
    })

    expect(without).not.toContain('bucket')
    expect(directive(without, 'connect-src')).toBe(
      "connect-src 'self' https://api.exemplo.test",
    )
  })

  it('cada resposta leva o nonce que recebeu', () => {
    const other = buildContentSecurityPolicy({
      nonce: 'outro',
      apiOrigin: 'https://api.exemplo.test',
    })

    expect(other).toContain("'nonce-outro'")
    expect(other).not.toContain('abc123')
  })
})

describe('SECURITY_HEADERS', () => {
  it('traz os quatro cabeçalhos fixos, sem HSTS (que só entra no build de produção)', () => {
    expect(Object.keys(SECURITY_HEADERS).sort()).toEqual([
      'Permissions-Policy',
      'Referrer-Policy',
      'X-Content-Type-Options',
      'X-Frame-Options',
    ])
  })

  it('nega câmera, microfone e localização, que nenhuma tela usa', () => {
    expect(SECURITY_HEADERS['Permissions-Policy']).toBe(
      'geolocation=(), camera=(), microphone=()',
    )
  })
})

describe('staticHeaders', () => {
  it('o HSTS só entra no build de produção', () => {
    expect(staticHeaders(true)['Strict-Transport-Security']).toBe(
      'max-age=31536000',
    )
    expect(staticHeaders(false)).not.toHaveProperty('Strict-Transport-Security')
  })
})
