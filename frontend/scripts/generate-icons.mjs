/**
 * Gera a identidade do site a partir do que o projeto já tem: favicon (ico e svg), ícone do
 * iOS, ícones do manifesto, `site.webmanifest` e o ícone do Aporta nas cores do tema.
 *
 *   node scripts/generate-icons.mjs
 *
 * Sem dependência nova: o Chromium do Playwright (já instalado para o E2E) rasteriza o SVG, e
 * as cores saem de `src/styles.css`, então trocar um token e rodar de novo atualiza tudo. O
 * `.ico` é montado à mão: o formato aceita PNG por dentro, e três imagens cabem em quinze
 * linhas, sem uma biblioteca de imagem por causa de um arquivo que quase nunca muda.
 *
 * O resultado vai para `public/` e é commitado: `public/` é o lugar de nome estável
 * (`_standards/frontend.md` §9.6), e o build não depende de o Chromium existir.
 * `generate-og.mjs` reaproveita as peças exportadas daqui.
 *
 * O Chromium vem de `E2E_CHROMIUM_PATH` (o mesmo do E2E) quando não está no cache do Playwright.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { chromium } from '@playwright/test'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const PUBLIC_DIR = resolve(ROOT, 'public')

const STYLES = resolve(ROOT, 'src/styles.css')
const FONT = resolve(
  ROOT,
  'node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2',
)

/** Os tokens do tema claro: o primeiro bloco `:root` de `styles.css`. */
export async function readTokens() {
  const css = await readFile(STYLES, 'utf8')
  const block = /:root\s*\{([^}]*)\}/.exec(css)?.[1] ?? ''
  const tokens = Object.fromEntries(
    [...block.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((match) => [
      match[1],
      match[2].trim(),
    ]),
  )
  const sky = [...css.matchAll(/\.scene-sky-(?:top|bottom)\s*\{[^}]*\}/g)]
    .map((match) => match[0])
    .join('\n')

  return { tokens, css: `:root{${block}}\n${sky}` }
}

/**
 * A porta do Aporta: arco de madeira num batente claro, sobre o verde da marca. `bleed` tira
 * o canto arredondado (o iOS e os ícones mascaráveis recortam sozinhos) e `inset` encolhe o
 * desenho para a zona segura do ícone mascarável.
 */
export function brandMark(tokens, { size, bleed = false, inset = 1 }) {
  const frame = tokens.wall
  const leaf = tokens.clay
  const ground = bleed ? '' : ` rx="14"`
  const scale = `translate(32 32) scale(${inset}) translate(-32 -32)`

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
<rect width="64" height="64"${ground} fill="${tokens.moss}"/>
<g transform="${scale}">
<path d="M16 54V30C16 21.2 23.2 14 32 14s16 7.2 16 16v24Z" fill="${frame}"/>
<path d="M21 54V30c0-6.1 4.9-11 11-11s11 4.9 11 11v24Z" fill="${leaf}"/>
<circle cx="38" cy="39" r="2" fill="${frame}"/>
<rect x="12" y="54" width="40" height="4" rx="2" fill="${frame}"/>
</g>
</svg>`
}

export async function launchBrowser() {
  const executablePath = process.env.E2E_CHROMIUM_PATH ?? undefined

  return chromium.launch({ executablePath })
}

/** O SVG vira PNG do tamanho dele, com fundo transparente onde o desenho não pinta. */
export async function rasterize(browser, html, width, height) {
  const page = await browser.newPage({ viewport: { width, height } })

  await page.setContent(
    `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:transparent}svg{display:block}</style>${html}`,
  )
  const png = await page.screenshot({ type: 'png', omitBackground: true })

  await page.close()

  return png
}

/** O `@font-face` da fonte do site, embutido: a página do Chromium não alcança o servidor. */
export async function fontFace() {
  const data = (await readFile(FONT)).toString('base64')

  return `@font-face{font-family:'Plus Jakarta Sans Variable';font-weight:200 800;src:url(data:font/woff2;base64,${data}) format('woff2')}`
}

/**
 * As cenas do projeto (`components/common/scene`) como marcação estática, uma por tipo. O módulo é TSX e usa
 * `#/`, então passa pelo Vite em modo de SSR, sem os plugins do produto: a mesma geometria do
 * site, sem uma segunda cópia do desenho.
 */
export async function renderScenes(kinds) {
  const vite = await createServer({
    root: ROOT,
    configFile: false,
    appType: 'custom',
    logLevel: 'error',
    plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null },
  })

  try {
    const { Scene } = await vite.ssrLoadModule(
      '/src/components/common/scene/scene.tsx',
    )

    return new Map(
      kinds.map((kind) => [
        kind,
        renderToStaticMarkup(createElement(Scene, { kind })),
      ]),
    )
  } finally {
    await vite.close()
  }
}

/** Um `.ico` com uma imagem PNG por tamanho (o formato aceita PNG por dentro desde o Vista). */
function buildIco(images) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)

  let offset = 6 + images.length * 16
  const entries = images.map(({ size, png }) => {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(size, 0)
    entry.writeUInt8(size, 1)
    entry.writeUInt16LE(1, 4)
    entry.writeUInt16LE(32, 6)
    entry.writeUInt32LE(png.length, 8)
    entry.writeUInt32LE(offset, 12)
    offset += png.length
    return entry
  })

  return Buffer.concat([header, ...entries, ...images.map(({ png }) => png)])
}

async function main() {
  const { tokens } = await readTokens()
  const browser = await launchBrowser()

  try {
    await mkdir(PUBLIC_DIR, { recursive: true })

    const write = (name, data) => writeFile(resolve(PUBLIC_DIR, name), data)
    const png = (size, options) =>
      rasterize(browser, brandMark(tokens, { size, ...options }), size, size)

    await write('favicon.svg', brandMark(tokens, { size: 64 }).concat('\n'))
    await write(
      'favicon.ico',
      buildIco(
        await Promise.all(
          [16, 32, 48].map(async (size) => ({ size, png: await png(size) })),
        ),
      ),
    )
    await write('apple-touch-icon.png', await png(180, { bleed: true }))
    await write('icon-192.png', await png(192))
    await write('icon-512.png', await png(512))
    await write(
      'icon-maskable-512.png',
      await png(512, { bleed: true, inset: 0.72 }),
    )
    await write(
      'site.webmanifest',
      `${JSON.stringify(
        {
          name: 'Aporta',
          short_name: 'Aporta',
          description:
            'Moradia e guia de Benjamin Constant, com contato direto com o dono pelo WhatsApp.',
          lang: 'pt-BR',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          theme_color: tokens.paper,
          background_color: tokens.paper,
          icons: [
            { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
            {
              src: '/icon-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        null,
        2,
      )}\n`,
    )
  } finally {
    await browser.close()
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main()
}
