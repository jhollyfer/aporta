/**
 * Desliga a compilação de schema do Zod no navegador, para o CSP do site não relatar violação.
 *
 * O Zod testa `new Function('')` para saber se pode compilar o parser de cada `z.object`, e o
 * CSP não tem `unsafe-eval`: o teste falha (o `try` do Zod engole o erro) e o navegador relata
 * a violação mesmo assim, uma por carga de página. Com `jitless` o teste nem acontece, e a
 * validação segue pelo caminho interpretado, o mesmo que o Zod usaria depois da falha
 * (`zod/v4/core/util.js`, `allowsEval`; https://zod.dev/basics).
 *
 * É um módulo de efeito colateral, importado **primeiro** em `router.tsx` e em `http.ts`, e
 * não uma chamada dentro de `getRouter`: o teste roda quando o schema é construído, e os
 * schemas do `@aporta/shared` se constroem ao importar, antes de `getRouter` existir. Os dois
 * importadores são de propósito: com um só, o bundler deixa este módulo no chunk de entrada e
 * o Zod num chunk comum que o entrada importa, e o chunk comum executa **antes** do corpo do
 * entrada (a configuração chegaria depois dos schemas). Com dois, ele sobe para o chunk comum,
 * na ordem de execução. Só no navegador: o servidor não tem CSP e continua com a compilação,
 * que é mais rápida.
 */
import { z } from 'zod'

if (!import.meta.env.SSR) z.config({ jitless: true })
