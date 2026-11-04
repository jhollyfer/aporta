import { E2eAccount } from './support/account'
import { E2eEnv } from './support/env'
import { administratorTest as test, expect } from './support/test'

/**
 * A gestão de contas pelo administrador, com três papéis em contextos separados: o administrador
 * lista, muda o papel e suspende/reativa uma conta de dono criada para a rodada; o dono, de
 * outra aba, perde a sessão quando é suspenso; o moderador não vê a aba "Contas" e é mandado
 * de volta à fila se digitar o endereço (`administrator/users/layout.tsx`).
 *
 * A conta-alvo nasce por API a cada rodada (o banco do E2E não é limpo), então mexer no papel
 * e no acesso dela não toca em conta que outro spec usa.
 *
 * Serial: os testes seguem a mesma conta.
 */
let targetEmail = ''
let targetState: Awaited<ReturnType<typeof E2eAccount.session>>['storageState']

test.describe('contas pelo administrador', () => {
  test.describe.configure({ mode: 'serial' })

  test('quando o administrador abre Contas e busca por e-mail, acha a conta e abre o detalhe', async ({
    page,
    playwright,
  }) => {
    const request = await playwright.request.newContext()

    try {
      const session = await E2eAccount.session(request)

      targetEmail = session.email
      targetState = session.storageState
    } finally {
      await request.dispose()
    }

    await page.goto('/administrator/users')
    await expect(
      page.getByRole('heading', { level: 1, name: 'Contas' }),
    ).toBeVisible()
    await expect(page.getByRole('link', { name: 'Contas' })).toBeVisible()

    await page.getByLabel('Buscar por nome ou e-mail').fill(targetEmail)
    await page.getByRole('button', { name: 'Buscar', exact: true }).click()

    const row = page.getByRole('listitem').filter({ hasText: targetEmail })
    await expect(row).toHaveCount(1)
    await expect(row.getByText('Dono de imóvel')).toBeVisible()

    await row.getByRole('link', { name: /^Gerenciar a conta de/ }).click()

    await expect(
      page.getByRole('heading', { level: 1, name: E2eAccount.name }),
    ).toBeVisible()
    await expect(page.getByText(targetEmail)).toBeVisible()
  })

  test('quando o administrador muda o papel e confirma, a conta vira Moderação e a sessão dela cai', async ({
    page,
    browser,
    expectHydrated,
  }) => {
    const context = await browser.newContext({
      baseURL: E2eEnv.baseUrl,
      storageState: targetState,
    })
    const owner = await context.newPage()

    try {
      await owner.goto('/account')
      await expect(owner.getByText(targetEmail)).toBeVisible()

      await page.goto('/administrator/users')
      await page.getByLabel('Buscar por nome ou e-mail').fill(targetEmail)
      await page.getByRole('button', { name: 'Buscar', exact: true }).click()
      await page
        .getByRole('link', { name: /^Gerenciar a conta de/ })
        .first()
        .click()

      // Sem escolher outro papel, "Mudar papel" não faz nada.
      const change = page.getByRole('button', {
        name: 'Mudar papel',
        exact: true,
      })
      await expect(change).toBeDisabled()
      await expectHydrated(change)

      await page
        .getByRole('group', { name: 'Papel da conta' })
        .getByRole('button', { name: 'Moderação' })
        .click()
      await change.click()

      const dialog = page.getByRole('alertdialog')
      await expect(dialog).toContainText(
        `Dar a ${E2eAccount.name} o papel "Moderação"?`,
      )
      await dialog.getByRole('button', { name: 'Mudar papel' }).click()

      await expect(
        page.getByText('Papel alterado. As sessões da conta caíram.'),
      ).toBeVisible()
      await expect(page.getByText('Moderação').first()).toBeVisible()

      // A sessão aberta do dono caiu: a conta pede entrada de novo.
      await owner.goto('/account')
      await expect(owner).toHaveURL(/\/sign-in/)
    } finally {
      await context.close()
    }
  })

  test('quando o administrador devolve o papel de dono, a lista passa a filtrar por esse papel na URL', async ({
    page,
  }) => {
    await page.goto('/administrator/users')
    await page.getByLabel('Buscar por nome ou e-mail').fill(targetEmail)
    await page.getByRole('button', { name: 'Buscar', exact: true }).click()
    await page
      .getByRole('link', { name: /^Gerenciar a conta de/ })
      .first()
      .click()

    await page
      .getByRole('group', { name: 'Papel da conta' })
      .getByRole('button', { name: 'Dono de imóvel' })
      .click()
    await page.getByRole('button', { name: 'Mudar papel', exact: true }).click()
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Mudar papel' })
      .click()
    await expect(
      page.getByText('Papel alterado. As sessões da conta caíram.'),
    ).toBeVisible()

    await page.getByRole('link', { name: 'Voltar às contas' }).click()
    await page
      .getByRole('group', { name: 'Papel da conta' })
      .getByRole('button', { name: 'Dono de imóvel' })
      .click()
    await expect(page).toHaveURL(/role=OWNER/)
  })

  test('quando o administrador suspende a conta, ela não entra mais; reativada, entra de novo', async ({
    page,
    playwright,
    expectHydrated,
  }) => {
    const request = await playwright.request.newContext()

    try {
      await page.goto('/administrator/users')
      await page.getByLabel('Buscar por nome ou e-mail').fill(targetEmail)
      await page.getByRole('button', { name: 'Buscar', exact: true }).click()
      await page
        .getByRole('link', { name: /^Gerenciar a conta de/ })
        .first()
        .click()
      await expect(page.getByText('Ativa', { exact: true })).toBeVisible()

      const suspend = page.getByRole('button', { name: 'Suspender conta' })
      await expectHydrated(suspend)
      await suspend.click()
      const dialog = page.getByRole('alertdialog')
      await expect(dialog).toContainText(
        `Suspender a conta de ${E2eAccount.name}?`,
      )
      await dialog.getByRole('button', { name: 'Suspender conta' }).click()

      await expect(
        page.getByText('Conta suspensa. As sessões dela caíram.'),
      ).toBeVisible()
      await expect(page.getByText('Suspensa', { exact: true })).toBeVisible()
      expect(
        await E2eAccount.attempt(request, targetEmail, E2eAccount.password),
      ).toBeGreaterThanOrEqual(400)

      await expect(dialog).toBeHidden()
      await page.getByRole('button', { name: 'Reativar conta' }).click()
      await dialog.getByRole('button', { name: 'Reativar conta' }).click()

      await expect(
        page.getByText('Conta reativada. A pessoa já pode entrar.'),
      ).toBeVisible()
      await expect(page.getByText('Ativa', { exact: true })).toBeVisible()
      expect(
        await E2eAccount.attempt(request, targetEmail, E2eAccount.password),
      ).toBe(204)
    } finally {
      await request.dispose()
    }
  })

  test('quando o administrador abre a própria conta, vê o aviso e nenhum botão de mudar papel ou suspender', async ({
    page,
  }) => {
    await page.goto('/administrator/users')
    await page
      .getByLabel('Buscar por nome ou e-mail')
      .fill(E2eEnv.administratorEmail())
    await page.getByRole('button', { name: 'Buscar', exact: true }).click()

    const row = page
      .getByRole('listitem')
      .filter({ hasText: E2eEnv.administratorEmail() })
    await expect(row.getByText('(você)')).toBeVisible()
    await row.getByRole('link', { name: /^Gerenciar a conta de/ }).click()

    await expect(page.getByText('Esta é a sua conta.')).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Suspender conta' }),
    ).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Mudar papel' })).toHaveCount(
      0,
    )
  })

  test('quando o moderador abre o painel, não vê a aba Contas e é mandado à fila se digitar o endereço', async ({
    moderatorPage,
  }) => {
    await moderatorPage.goto('/administrator/listings')
    await expect(
      moderatorPage.getByRole('heading', { level: 1, name: 'Anúncios' }),
    ).toBeVisible()
    const nav = moderatorPage.getByRole('navigation', {
      name: 'Painel da equipe',
    })
    await expect(nav.getByRole('link', { name: 'Guia' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Contas' })).toHaveCount(0)

    await moderatorPage.goto('/administrator/users')
    await expect(moderatorPage).toHaveURL(/\/administrator\/listings/)
    await expect(
      moderatorPage.getByRole('heading', { level: 1, name: 'Anúncios' }),
    ).toBeVisible()
  })

  test('quando o dono comum digita o endereço de Contas, vai para a conta dele', async ({
    ownerPage,
  }) => {
    await ownerPage.goto('/administrator/users')

    await expect(ownerPage).toHaveURL(/\/account/)
  })
})
