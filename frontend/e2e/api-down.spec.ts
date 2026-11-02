import { expect, test } from './support/test'

/**
 * A API fora do ar não pode virar tela em branco: o `loader` falha e o router desenha o
 * `defaultErrorComponent` (`router.tsx`), com a saída de voltar ao início.
 *
 * O `page.route` só intercepta o que o navegador pede, então o que se prova aqui é a
 * navegação **no cliente**: abre-se a home com a API de pé (o SSR a alcança por fora do
 * navegador), derruba-se a API e segue-se o link da listagem. É o caso real de quem está
 * com a página aberta quando o servidor cai. O SSR com a API fora do ar não é coberto por
 * E2E, porque derrubar o backend no meio da execução atrapalharia os outros specs.
 */
test('quando a API cai com a página aberta, a listagem mostra o erro e não a tela em branco', async ({
  page,
  errors,
  expectHydrated,
}) => {
  // O navegador registra no console cada pedido derrubado de propósito, e o React o erro
  // que o boundary do router captura: é o que o teste provoca.
  errors.allow(/Failed to load resource/)
  errors.allow(/NETWORK_ERROR|HTTPError/)

  await page.goto('/')

  const link = page.getByRole('link', { name: 'Ver todos os imóveis' })
  await expectHydrated(link)

  await page.route('**/storefront/**', (route) =>
    route.abort('connectionrefused'),
  )
  await link.click()

  await expect(
    page.getByRole('heading', { level: 1, name: 'Algo deu errado' }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Tentar de novo' }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Voltar ao início' }),
  ).toBeVisible()
})
