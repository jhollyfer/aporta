/**
 * Gera a prévia de link (Open Graph), 1200x630, a partir da cena do projeto.
 *
 *   node scripts/generate-og.mjs
 *
 * Saem quatro imagens em `public/`: `og-image.png` (a panorâmica do rio, a prévia padrão do
 * site) e uma por fachada de anúncio (`og-house.png`, `og-building.png`, `og-hotel.png`), que
 * é o que a página de um anúncio usa. **Nenhuma leva foto**: a foto do dono mora em bucket
 * privado e uma prévia pública dela vazaria o que o dono não escolheu publicar. A cena desenha
 * "aqui entra a foto" e não finge ser ela (`docs/DESIGN.md` §1).
 *
 * O texto é só o nome e a cidade, sem frase: a mesma imagem serve ao português, ao inglês e ao
 * espanhol. Quem lê a descrição é o `og:description`, que muda por idioma.
 *
 * As peças (cena, cores, fonte, Chromium) vêm de `generate-icons.mjs`, para o desenho do ícone
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
  renderScenes,
} from './generate-icons.mjs'

const WIDTH = 1200
const HEIGHT = 630
const TEXT_COLUMN = 480

/** Arquivo e cena de cada prévia. A cena é a mesma que o card desenha na falta de foto. */
const IMAGES = [
  { file: 'og-image.png', kind: 'PANORAMA' },
  { file: 'og-house.png', kind: 'HOUSE' },
  { file: 'og-building.png', kind: 'BUILDING' },
  { file: 'og-hotel.png', kind: 'HOTEL' },
]

function page({ css, font, tokens, scene }) {
  return `<!doctype html><meta charset="utf-8"><style>
${css}
${font}
html,body{margin:0}
.card{display:flex;width:${WIDTH}px;height:${HEIGHT}px;background:${tokens.paper};font-family:'Plus Jakarta Sans Variable',sans-serif}
.text{flex:none;width:${TEXT_COLUMN}px;box-sizing:border-box;padding:72px 56px;display:flex;flex-direction:column;justify-content:space-between}
.name{margin:0;font-size:116px;line-height:1;font-weight:800;letter-spacing:-0.03em;color:${tokens['moss-deep']}}
.place{margin:20px 0 0;font-size:40px;font-weight:700;color:${tokens['ink-soft']}}
.scene{flex:1;overflow:hidden}
.scene svg{display:block;width:100%;height:100%}
</style>
<div class="card">
  <div class="text">
    ${brandMark(tokens, { size: 120 })}
    <div><p class="name">Aporta</p><p class="place">Benjamin Constant</p></div>
  </div>
  <div class="scene">${scene}</div>
</div>`
}

async function main() {
  const { tokens, css } = await readTokens()
  const font = await fontFace()
  const scenes = await renderScenes(IMAGES.map(({ kind }) => kind))
  const browser = await launchBrowser()

  try {
    for (const { file, kind } of IMAGES) {
      const scene = scenes.get(kind)
      const tab = await browser.newPage({
        viewport: { width: WIDTH, height: HEIGHT },
      })

      await tab.setContent(page({ css, font, tokens, scene }))
      await tab.evaluate(() => document.fonts.ready)
      await writeFile(
        resolve(PUBLIC_DIR, file),
        await tab.screenshot({ type: 'png' }),
      )
      await tab.close()
    }
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
