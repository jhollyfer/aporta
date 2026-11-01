import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

/**
 * A configuração dos testes, separada da do aplicativo.
 *
 * Sem este arquivo o Vitest lê o `vite.config.ts` inteiro, e com ele vem a
 * cadeia de plugins do produto: `nitro()`, `tanstackStart()`, `paraglide` e o
 * `devtools`. Nada disso serve a um teste de função pura, e dois defeitos
 * saíam daí a cada rodada:
 *
 *   ReferenceError: module is not defined
 *       at node_modules/react/index.js:6:3
 *       at ESModulesEvaluator.runInlinedModule
 *
 * - o `react/index.js` é CommonJS, e o module runner do Vite 8 o avaliava como
 * ESM ao aquecer a entrada de SSR que o plugin do Start registra; e
 *
 *   close timed out after 10000ms
 *   Tests closed successfully but something prevents Vite server from exiting
 *
 * - o servidor do Nitro subia junto com a suíte e não desligava.
 *
 * Os dois eram ruído: os 229 testes passavam do mesmo jeito. E é exatamente
 * por isso que precisavam sair - um erro de import de verdade apareceria com
 * essa mesma cara, no meio dessas mesmas linhas, e ninguém olharia duas vezes.
 *
 * O que fica é o mínimo que a suíte usa - e o dia em que um teste monta árvore
 * de React chegou: `rich-text.test.tsx` renderiza `<RichText>` com
 * `renderToStaticMarkup`. `@vitejs/plugin-react` entra aqui, e só ele - o
 * resto da cadeia do produto continua fora.
 *
 * `tsconfigPaths` porque o alias `#/` do `package.json` é o que os testes usam
 * para alcançar `#/lib` e `#/integrations`.
 */
export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    /*
     * `node` como padrão, e o `jsdom` pedido por arquivo.
     *
     * A maioria dos testes não precisa de DOM, e os que precisam - o de
     * `use-resource-form`, que renderiza um hook, e o de `rich-text`, que
     * renderiza JSX - já declaram `// @vitest-environment jsdom` no topo.
     * Ligar o jsdom por padrão custaria o ambiente inteiro por arquivo sem que
     * a maior parte da suíte tocasse em `document`.
     */
    environment: 'node',
    /*
     * Os dois lugares onde há teste, e não o default do Vitest.
     *
     * `scripts/` entra por nome próprio: `check-chunk-cycles.test.ts` guarda o
     * guarda-ciclos, mora fora de `src/` e sumiria de um `include` que só
     * olhasse ali - oito testes deixando de rodar sem nada ficar vermelho.
     * `.tsx` entra ao lado de `.ts`: `rich-text.test.tsx` é o primeiro teste
     * que monta componente.
     */
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'scripts/**/*.test.ts'],
  },
})
