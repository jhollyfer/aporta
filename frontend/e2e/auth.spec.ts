import { E2eAccount } from './support/account'
import { expect, test } from './support/test'

/**
 * Cadastro, entrada e saída do dono, e o portão de sessão.
 *
 * O limite de entrada da API é de 5 por minuto por IP (`backend/start/limiter.ts`), e
 * estourar bloqueia por 10 minutos, e o do cadastro é igual. Este arquivo faz quatro
 * entradas e quatro cadastros ao todo, de
 * propósito: um teste novo que entre pela tela entra na conta desse orçamento, e uma
 * rodada repetida dentro do mesmo minuto toma 429. Quem só precisa de conta existente
 * usa `E2eAccount.create`, que não passa pela tela.
 *
 * Serial porque os testes dividem o orçamento do limite, e rodar em paralelo o
 * gastaria de uma vez.
 */
test.describe.configure({ mode: 'serial' })

test.describe('conta do dono', () => {
  test('quando se cria a conta, cai em Minha conta, e ao sair o site volta a oferecer Entrar', async ({
    page,
    expectHydrated,
  }) => {
    const email = E2eAccount.email()

    await page.goto('/sign-up')
    await expectHydrated(page.getByRole('button', { name: 'Criar conta' }))

    await page.getByLabel('Nome').fill(E2eAccount.name)
    await page.getByLabel('E-mail').fill(email)
    await page.getByLabel('Senha', { exact: true }).fill(E2eAccount.password)
    await page.getByLabel('Repita a senha').fill(E2eAccount.password)
    await page.getByRole('button', { name: 'Criar conta' }).click()

    await expect(page).toHaveURL(/\/account$/)
    await expect(
      page.getByRole('heading', { level: 1, name: 'Minha conta' }),
    ).toBeVisible()
    await expect(page.getByText(email)).toBeVisible()
    await expect(page.getByText(E2eAccount.name)).toBeVisible()
    await expect(page.getByText('Dono de imóvel')).toBeVisible()

    await page.getByRole('button', { name: 'Sair' }).click()

    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('link', { name: 'Entrar' })).toBeVisible()

    // Sem sessão, a página privada volta a ser barrada.
    await page.goto('/account')
    await expect(page).toHaveURL(/\/sign-in\?redirect=%2Faccount$/)
  })

  test('quando a senha está errada, mostra o erro geral sem dizer se o e-mail existe', async ({
    page,
    request,
    errors,
    expectHydrated,
  }) => {
    // O 401 do sign-in é a resposta esperada, e o navegador a registra no console.
    errors.allow(/status of 401/)

    const email = await E2eAccount.create(request)

    await page.goto('/sign-in')
    await expectHydrated(page.getByRole('button', { name: 'Entrar' }))

    await page.getByLabel('E-mail').fill(email)
    await page.getByLabel('Senha').fill('Outra@Senha99')
    await page.getByRole('button', { name: 'Entrar' }).click()

    await expect(page.getByRole('alert')).toHaveText(
      'E-mail ou senha incorretos.',
    )
    await expect(page).toHaveURL(/\/sign-in$/)
    // O botão volta a aceitar envio depois da resposta.
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeEnabled()
  })
})

test.describe('portão de sessão', () => {
  test('quando se abre /account sem sessão, vai para a entrada e, ao entrar com a senha certa, volta para a conta', async ({
    page,
    request,
    expectHydrated,
  }) => {
    const email = await E2eAccount.create(request)

    await page.goto('/account')

    await expect(page).toHaveURL(/\/sign-in\?redirect=%2Faccount$/)
    await expectHydrated(page.getByRole('button', { name: 'Entrar' }))

    await page.getByLabel('E-mail').fill(email)
    await page.getByLabel('Senha').fill(E2eAccount.password)
    await page.getByRole('button', { name: 'Entrar' }).click()

    await expect(page).toHaveURL(/\/account$/)
    await expect(
      page.getByRole('heading', { level: 1, name: 'Minha conta' }),
    ).toBeVisible()

    // A vitrine é pública e sai igual para todos: quem troca "Entrar" por "Minha conta"
    // é o navegador, depois de perguntar à API.
    await page.goto('/')
    await expect(page.getByRole('link', { name: 'Minha conta' })).toBeVisible()
  })

  test('quando o redirect aponta para outro site, é ignorado e a entrada cai na conta', async ({
    page,
    request,
    expectHydrated,
  }) => {
    const email = await E2eAccount.create(request)

    await page.goto('/sign-in?redirect=%2F%2Fevil.test')
    await expectHydrated(page.getByRole('button', { name: 'Entrar' }))

    await page.getByLabel('E-mail').fill(email)
    await page.getByLabel('Senha').fill(E2eAccount.password)
    await page.getByRole('button', { name: 'Entrar' }).click()

    await expect(page).toHaveURL(/\/account$/)
    expect(new URL(page.url()).hostname).not.toBe('evil.test')
  })
})
