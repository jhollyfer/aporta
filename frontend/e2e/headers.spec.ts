import type { Page } from '@playwright/test'

import { E2eEnv } from './support/env'
import { expect, test } from './support/test'

/**
 * Os cabeçalhos de segurança e o cache do app (`src/server.ts`, `vite.config.ts` e
 * `src/lib/security-headers.ts`), e a prova de que o CSP não quebra o site: nenhuma violação
 * nas páginas principais, nos dois temas. O E2E roda contra o build de produção (`node
 * .output/server/index.mjs`), que é onde o CSP e o HSTS existem.
 */
const PAGES = [
  '/',
  '/listings',
  '/listings?view=map',
  '/listings/kitnet-centro-porto',
  '/guide',
  '/list-your-place',
  '/sign-in',
] as const

const SCHEMES = ['light', 'dark'] as const

/** Uma diretiva do CSP pelo nome: `script-src 'self' ...`. */
function directive(policy: string, name: string): string {
  return policy.split('; ').find((item) => item.startsWith(`${name} `)) ?? ''
}

/**
 * Guarda as violações que o navegador relata, pelo evento `securitypolicyviolation`. É a
 * fonte, e não o texto do console: o evento traz a diretiva e o endereço bloqueado, e não
 * depende de o Chromium escrever a mensagem do mesmo jeito amanhã.
 */
async function watchViolations(page: Page): Promise<() => Promise<string[]>> {
  await page.addInitScript(() => {
    const seen: string[] = []

    Reflect.set(window, '__cspViolations', seen)
    document.addEventListener('securitypolicyviolation', (event) => {
      seen.push(`${event.violatedDirective} ${event.blockedURI}`)
    })
  })

  return () =>
    page.evaluate(() => {
      const seen: unknown = Reflect.get(window, '__cspViolations')

      return Array.isArray(seen) ? seen.map(String) : []
    })
}

test.describe('cabeçalhos da página', () => {
  test('quando se pede o HTML, vem o CSP com nonce e os cabeçalhos fixos', async ({
    request,
  }) => {
    const response = await request.get(`${E2eEnv.baseUrl}/listings`)
    const headers = response.headers()
    const csp = headers['content-security-policy'] ?? ''

    expect(response.status()).toBe(200)
    expect(directive(csp, 'default-src')).toBe("default-src 'self'")
    expect(directive(csp, 'script-src')).toMatch(
      /^script-src 'self' 'nonce-[A-Za-z0-9+/=]+'$/,
    )
    // Sem `unsafe-inline` em script: o `nonce` é o que deixa o Start hidratar.
    expect(directive(csp, 'script-src')).not.toContain('unsafe')
    expect(directive(csp, 'img-src')).toContain(
      'https://tile.openstreetmap.org',
    )
    expect(directive(csp, 'connect-src')).toContain(
      new URL(E2eEnv.apiUrl).origin,
    )
    expect(directive(csp, 'frame-ancestors')).toBe("frame-ancestors 'none'")
    expect(directive(csp, 'base-uri')).toBe("base-uri 'self'")
    expect(directive(csp, 'form-action')).toBe("form-action 'self'")

    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
    expect(headers['x-frame-options']).toBe('DENY')
    expect(headers['permissions-policy']).toBe(
      'geolocation=(), camera=(), microphone=()',
    )
    expect(headers['strict-transport-security']).toMatch(/^max-age=\d+/)
    // HTML nunca fica em cache longo: o próximo deploy tem de chegar.
    expect(headers['cache-control']).toBe('no-cache')
  })

  test('quando se pede o HTML duas vezes, o nonce muda, e o mesmo nonce está nos scripts da página', async ({
    request,
  }) => {
    const nonceOf = (csp: string | undefined): string =>
      /'nonce-([^']+)'/.exec(csp ?? '')?.[1] ?? ''

    const first = await request.get(`${E2eEnv.baseUrl}/guide`)
    const second = await request.get(`${E2eEnv.baseUrl}/guide`)
    const firstNonce = nonceOf(first.headers()['content-security-policy'])

    expect(firstNonce).not.toBe('')
    expect(firstNonce).not.toBe(
      nonceOf(second.headers()['content-security-policy']),
    )
    expect(await first.text()).toContain(`nonce="${firstNonce}"`)
  })

  test('quando se pede um ativo com hash, o cache é imutável', async ({
    request,
  }) => {
    const html = await (await request.get(`${E2eEnv.baseUrl}/`)).text()
    const asset = /src="(\/assets\/[^"]+\.js)"/.exec(html)?.[1]

    expect(asset).toBeDefined()

    const response = await request.get(`${E2eEnv.baseUrl}${asset}`)

    expect(response.status()).toBe(200)
    expect(response.headers()['cache-control']).toBe(
      'public, max-age=31536000, immutable',
    )
    expect(response.headers()['x-content-type-options']).toBe('nosniff')
  })

  test('quando se pede a identidade do site, os arquivos existem e não são imutáveis', async ({
    request,
  }) => {
    const files = [
      ['/favicon.ico', 'image/vnd.microsoft.icon'],
      ['/favicon.svg', 'image/svg+xml'],
      ['/apple-touch-icon.png', 'image/png'],
      ['/icon-192.png', 'image/png'],
      ['/icon-512.png', 'image/png'],
      ['/og-image.png', 'image/png'],
      ['/site.webmanifest', 'manifest'],
    ] as const

    for (const [path, type] of files) {
      const response = await request.get(`${E2eEnv.baseUrl}${path}`)

      expect(response.status(), path).toBe(200)
      expect(response.headers()['content-type'], path).toContain(type)
      expect(response.headers()['cache-control'], path).not.toContain(
        'immutable',
      )
    }
  })
})

test.describe('o head carrega a identidade e a prévia de link', () => {
  test('quando se abre a home, o head tem os ícones, o manifesto e a prévia absoluta', async ({
    page,
  }) => {
    await page.goto('/')

    const origin = new URL(E2eEnv.baseUrl).origin

    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
      'href',
      '/site.webmanifest',
    )
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
      'href',
      '/apple-touch-icon.png',
    )
    await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute(
      'content',
      'light dark',
    )
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      `${origin}/og-image.png`,
    )
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      'content',
      'summary_large_image',
    )
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute(
      'content',
      'pt_BR',
    )
  })

  test('quando se abre um anúncio, a prévia é a cena do tipo, e não uma foto', async ({
    page,
  }) => {
    await page.goto('/listings/kitnet-centro-porto')

    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      `${new URL(E2eEnv.baseUrl).origin}/og-building.png`,
    )
  })

  test('quando o idioma é o inglês, o og:locale acompanha', async ({
    page,
  }) => {
    await page.goto('/en')

    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute(
      'content',
      'en_US',
    )
  })
})

for (const scheme of SCHEMES) {
  test.describe(`CSP sem violação, tema ${scheme}`, () => {
    test.use({ colorScheme: scheme })

    for (const path of PAGES) {
      test(`quando se abre ${path}, a página hidrata e o navegador não relata violação`, async ({
        page,
        expectHydrated,
      }) => {
        const violations = await watchViolations(page)

        await page.goto(path)
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        await expectHydrated(page.getByRole('link').first())

        // O mapa carrega depois da hidratação (lazy): espera os ladrilhos serem pedidos, que é
        // onde o `img-src` do OpenStreetMap seria barrado.
        if (path.includes('view=map')) {
          await expect(
            page.getByRole('link', { name: 'OpenStreetMap' }),
          ).toBeVisible()
        }

        expect(await violations()).toEqual([])
      })
    }
  })
}
