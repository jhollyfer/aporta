/**
 * Os cabeçalhos de segurança do site, num módulo sem import de propósito: o `vite.config.ts`
 * (que roda no Node, antes do alias `#/` existir) e o servidor de SSR leem o mesmo arquivo, e
 * a lista não pode divergir entre os dois.
 *
 * Referência: `_doc-lib/nitro.md#config` (`routeRules.headers`) e a documentação do Nitro
 * sobre regras de rota (https://nitro.build/raw/docs/configuration.md, seção "Route rules").
 */

/** O que todo ativo com hash no nome (`/assets/*`) ganha: o nome muda quando o conteúdo muda. */
export const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable'

/**
 * Os arquivos de `public/` (ícones, prévia de link, manifesto) têm nome estável: o conteúdo
 * muda sem o nome mudar, então não podem ser `immutable`. Um dia, e revalida em segundo plano
 * por uma semana: o ícone novo chega sem o visitante esperar por ele.
 */
export const STABLE_PUBLIC_CACHE =
  'public, max-age=86400, stale-while-revalidate=604800'

/**
 * Cabeçalhos estáticos de toda resposta. Vão por `routeRules` do Nitro (`/**`), então valem
 * também para os arquivos de `public/`, que o servidor de SSR nunca vê.
 *
 * `Permissions-Policy`: nenhuma tela usa câmera, microfone nem localização (o mapa mostra
 * pontos dos anúncios, não a posição de quem olha), então os três ficam vazios. Se um dia o
 * "perto de mim" existir, `geolocation=(self)` entra junto com ele.
 *
 * `X-Frame-Options` repete o `frame-ancestors 'none'` do CSP para os navegadores que ainda
 * não leem a diretiva.
 */
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), camera=(), microphone=()',
  'X-Frame-Options': 'DENY',
} as const

/**
 * HSTS: um ano, sem `includeSubDomains` nem `preload`. O site mora num subdomínio de um
 * domínio que tem outros serviços, e forçar HTTPS em todos eles por uma regra que o Aporta
 * decidiu sozinho é decisão que não é dele. Só no build de produção: em `pnpm dev` o
 * cabeçalho sobre `http://localhost` é ignorado, mas um navegador que o guardasse por engano
 * é o tipo de defeito que ninguém liga a esta causa.
 */
export const HSTS_HEADER = 'max-age=31536000'

/** Os cabeçalhos fixos, mais o HSTS quando é o build de produção. */
export function staticHeaders(production: boolean): Record<string, string> {
  if (production) {
    return { ...SECURITY_HEADERS, 'Strict-Transport-Security': HSTS_HEADER }
  }

  return { ...SECURITY_HEADERS }
}

/** O que `buildContentSecurityPolicy` precisa saber do ambiente. */
export type ContentSecurityPolicyInput = {
  /** O `nonce` desta resposta, que o Start põe nos `<script>` em linha da hidratação. */
  nonce: string
  /** A origem da API (`VITE_API_URL`): o navegador chama `fetch` direto nela. */
  apiOrigin: string
  /** A origem do bucket, quando conhecida (`STORAGE_PUBLIC_URL`): fotos e envio em partes. */
  storageOrigin?: string
}

/**
 * Os ladrilhos do mapa. O servidor de hoje é o domínio sem subdomínio (`tile.openstreetmap.org`)
 * e o curinga cobre os `a`, `b` e `c` antigos: `*.tile...` sozinho **não** casa com o domínio
 * puro, e o mapa abriria sem um único ladrilho (o CSP só diz isso no console).
 */
const TILES = 'https://tile.openstreetmap.org https://*.tile.openstreetmap.org'

/**
 * A política de conteúdo de uma resposta HTML. Muda por resposta porque o `nonce` muda.
 *
 * - `script-src 'self' 'nonce-…'`: o Start injeta `<script>` em linha com os dados da
 *   hidratação, e cada um leva o `nonce` (`router.options.ssr.nonce`). Sem `unsafe-inline`:
 *   um HTML injetado por um anúncio (o texto do dono é escapado, mas a defesa em
 *   profundidade é esta) não executa.
 * - `style-src 'self'` e `style-src-attr 'unsafe-inline'`: o CSS é arquivo próprio, mas o
 *   React escreve `style="..."` no HTML do servidor (as cenas SVG pintam com `var(--token)`
 *   por atributo). Atributo de estilo não executa código; o risco que sobra é de aparência, e
 *   trocá-los por classe é refatorar toda cena para fechar uma brecha que não roda script.
 * - `img-src`: ladrilhos do OpenStreetMap, `data:` (SVG e ícones pequenos que o Vite embute),
 *   `blob:` (a prévia da foto antes do envio) e o bucket, que serve as fotos por URL assinada.
 * - `connect-src`: a API, e o bucket, para onde o navegador envia as partes da foto direto.
 */
export function buildContentSecurityPolicy({
  nonce,
  apiOrigin,
  storageOrigin,
}: ContentSecurityPolicyInput): string {
  const storage = [storageOrigin].filter(
    (origin): origin is string => origin !== undefined,
  )

  const directives: Record<string, ReadonlyArray<string>> = {
    'default-src': ["'self'"],
    'script-src': ["'self'", `'nonce-${nonce}'`],
    'style-src': ["'self'"],
    'style-src-attr': ["'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', TILES, ...storage],
    'font-src': ["'self'", 'data:'],
    'connect-src': ["'self'", apiOrigin, ...storage],
    'manifest-src': ["'self'"],
    'object-src': ["'none'"],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
  }

  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(' ')}`)
    .join('; ')
}
