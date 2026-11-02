/** Para onde voltar depois de entrar, quando o portão barrou alguém no meio do caminho. */
export type RedirectSearch = {
  redirect?: string
}

/**
 * Valida o `?redirect=` das telas de entrada e cadastro.
 *
 * À mão e não com schema: a regra é de segurança (caminho interno, nunca outro host), não
 * de forma, e cada linha abaixo é um caso de ataque com nome. Um `z.string().refine(...)`
 * seria o mesmo código dentro de um callback.
 *
 * Mora fora de `routes/` para ser testada sem o gerador da árvore de rotas tratar o
 * arquivo de teste como rota (`_standards/frontend.md` §3.5).
 */
/**
 * O que a validação devolve quando recusa o destino: a chave presente e `undefined`, e não `{}`.
 *
 * O `search` de uma rota é a validação mesclada POR CIMA do search bruto da URL. `{}` não
 * apaga nada nessa mescla, então `?redirect=//evil.test` sobrevivia intacto até o hook de
 * entrada e a pessoa era levada para `/evil.test` (os testes unitários passavam, porque
 * `toEqual({})` trata chave `undefined` como ausente). Só uma chave explícita sobrescreve.
 */
const REFUSED: RedirectSearch = { redirect: undefined }

export function validateRedirectSearch(
  search: Record<string, unknown>,
): RedirectSearch {
  const value = search['redirect']

  if (typeof value !== 'string') return REFUSED

  // Só caminho interno. `https://evil.test` é óbvio, mas `//evil.test` também é
  // navegação externa: o navegador lê como "mesmo protocolo, outro host". Sem esta linha,
  // um link com `?redirect=` leva a pessoa para fora logo depois de digitar a senha, e a
  // barra de endereço não entrega nada.
  if (!value.startsWith('/') || value.startsWith('//')) return REFUSED

  // `\` no lugar de `/` é a variação que o navegador normaliza de volta para `//` e que
  // passa por uma checagem feita só na barra.
  if (value.startsWith('/\\')) return REFUSED

  // Caractere de controle (tab, quebra de linha) no começo: o navegador os remove ao
  // interpretar a URL, e `/\t/evil.test` viraria `//evil.test` depois da checagem.
  // eslint-disable-next-line no-control-regex -- é exatamente o que se quer recusar
  if (/[\u0000-\u001f]/.test(value)) return REFUSED

  return { redirect: value }
}

/**
 * O destino depois de entrar: o `redirect` da URL, já validado, ou a conta quando a
 * pessoa chegou sem ele. Uma função só para o formulário, o guard do `beforeLoad` e o
 * guard de hidratação do layout, que precisam concordar: se divergissem, quem já está
 * logado e quem acabou de entrar iriam para lugares diferentes.
 */
export function redirectDestination(search: RedirectSearch): string {
  return search.redirect ?? '/account'
}
