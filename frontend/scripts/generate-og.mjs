/**
 * Gera a prévia de link (Open Graph), 1200x630.
 *
 *   node scripts/generate-og.mjs
 *
 * Sai uma imagem só, `public/og-image.png`, em tipografia e cor da paleta: o nome, a cidade e a
 * porta da marca. **Nem foto nem ilustração de imóvel**: a foto do dono mora em bucket privado e
 * uma prévia pública dela vazaria o que ele não escolheu publicar, e o desenho de casa, prédio
 * ou paisagem passa impressão de imagem gerada (`docs/DESIGN.md` §1).
 *
 * O texto é só o nome e a cidade, sem frase: a mesma imagem serve ao português, ao inglês e ao
 * espanhol. Quem lê a descrição é o `og:description`, que muda por idioma.
 *
 * As peças (cores, fonte, marca, Chromium) vêm de `generate-icons.mjs`, para o desenho do ícone
 * e o da prévia nunca divergirem. Mesmos requisitos: `docs/ENV.md`.
 */
import { resolve } from 'node:path'
import { writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

import {
  PUBLIC_DIR,
  brandMark,
  fontFace,
  launchBrowser,
  readTokens,
} from './generate-icons.mjs'

const WIDTH = 1200
const HEIGHT = 630

function page({ css, font, tokens }) {
  return `<!doctype html><meta charset="utf-8"><style>
${css}
${font}
html,body{margin:0}
.card{position:relative;display:flex;width:${WIDTH}px;height:${HEIGHT}px;background:${tokens.paper};font-family:'Plus Jakarta Sans Variable',sans-serif;overflow:hidden}
.text{flex:1;box-sizing:border-box;padding:72px 64px;display:flex;flex-direction:column;justify-content:space-between}
.name{margin:0;font-size:176px;line-height:.9;font-weight:800;letter-spacing:-0.04em;color:${tokens['moss-deep']}}
.place{margin:24px 0 0;font-size:44px;font-weight:700;color:${tokens['ink-soft']}}
.field{flex:none;width:340px;background:${tokens.stage};display:flex;align-items:flex-end;justify-content:center}
.door{width:220px;height:300px;background:${tokens.wall};border-radius:110px 110px 0 0;display:flex;align-items:flex-end;justify-content:center}
.leaf{width:170px;height:260px;background:${tokens.clay};border-radius:85px 85px 0 0}
</style>
<div class="card">
  <div class="text">
    ${brandMark(tokens, { size: 96 })}
    <div><p class="name">Aporta</p><p class="place">Benjamin Constant</p></div>
  </div>
  <div class="field"><div class="door"><div class="leaf"></div></div></div>
</div>`
}

async function main() {
  const { tokens, css } = await readTokens()
  const font = await fontFace()
  const browser = await launchBrowser()

  try {
    const tab = await browser.newPage({
      viewport: { width: WIDTH, height: HEIGHT },
    })

    await tab.setContent(page({ css, font, tokens }))
    await tab.evaluate(() => document.fonts.ready)
    await writeFile(
      resolve(PUBLIC_DIR, 'og-image.png'),
      await tab.screenshot({ type: 'png' }),
    )
    await tab.close()
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
