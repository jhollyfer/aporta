import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { paraglideVitePlugin } from '@inlang/paraglide-js'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    /*
     * A mesma estratégia dos irmãos, `url` e depois `baseLocale`, e aqui ela é
     * usada de verdade: o site da Maiyu fala três línguas desde antes da
     * migração (português, inglês e espanhol, para quem chega pela fronteira
     * com o Peru e a Colômbia).
     *
     * O português é o idioma base e não leva prefixo, então todo link já
     * compartilhado do site antigo (`/portfolio`, `/blog/...`) continua
     * respondendo igual. Inglês e espanhol ganham endereço próprio (`/en/...`,
     * `/es/...`), que é o que deixa o buscador indexar as três versões e o
     * `hreflang` apontar para cada uma.
     */
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/paraglide',
      strategy: ['url', 'baseLocale'],
    }),
    // Cravar o preset: sem ele o Nitro detecta a plataforma pelas variáveis de
    // ambiente do CI e só cai em `node-server` quando nenhuma responde. É o que
    // o `Dockerfile-production` espera.
    nitro({ preset: 'node-server' }),
    tailwindcss(),
    tanstackStart({
      router: {
        routeToken: 'layout',
      },
    }),
    viteReact(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
})

export default config
