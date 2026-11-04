import { z } from 'zod'

import { E2eEnv } from './support/env'
import { administratorTest, expect, staffTest as test } from './support/test'

/**
 * O guia da cidade pela equipe, com o visitante conferindo a página pública a cada passo: a
 * moderadora cadastra um lugar e ele aparece em `/guide`, edita o nome, arquiva (some do guia e
 * entra em "Arquivados"), restaura (volta) e arquiva de novo para deixar o guia como estava.
 * Depois o administrador, e só ele, exclui de vez um lugar arquivado.
 *
 * O texto do lugar é em português só (a tabela não tem os três idiomas, `DECISIONS.md` #35).
 *
 * Serial: os testes seguem o mesmo lugar.
 */
const STAMP = Date.now()
const NAME = `Tacacá do E2E ${STAMP}`
const NEW_NAME = `${NAME} (reformado)`

test.describe('guia da cidade pela equipe', () => {
  test.describe.configure({ mode: 'serial' })

  test('quando a moderadora cadastra um lugar com campo faltando, o erro fica no campo e nada é criado', async ({
    page,
    expectHydrated,
  }) => {
    await page.goto('/administrator/places/new')
    await expect(
      page.getByRole('heading', { level: 1, name: 'Novo lugar' }),
    ).toBeVisible()

    const submit = page.getByRole('button', { name: 'Cadastrar lugar' })
    await expectHydrated(submit)
    await page.getByLabel('Nome do lugar').fill('a')
    await submit.click()

    await expect(page.getByLabel('Nome do lugar')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    await expect(page).toHaveURL(/\/administrator\/places\/new/)
  })

  test('quando a moderadora cadastra o lugar, ele volta à lista e o visitante o vê no guia', async ({
    page,
    visitorPage,
    expectHydrated,
  }) => {
    await page.goto('/administrator/places/new')

    const submit = page.getByRole('button', { name: 'Cadastrar lugar' })
    await expectHydrated(submit)
    await page.getByLabel('Aba do guia').selectOption('EAT')
    await page.getByLabel('Nome do lugar').fill(NAME)
    await page
      .getByLabel('Descrição')
      .fill('Tacacá quente no fim da tarde, com tucupi de verdade.')
    await page.getByLabel('Bairro').selectOption('centro')
    await page.getByLabel('Rua e número').fill('Praça da Matriz, 1')
    await page.getByLabel('Horário').fill('Todos os dias, 16h às 21h')
    await submit.click()

    await expect(page).toHaveURL(/\/administrator\/places(\?|$)/)
    await expect(
      page.getByRole('heading', { level: 1, name: 'Guia da cidade' }),
    ).toBeVisible()

    await visitorPage.goto('/guide?category=EAT')
    await expect(visitorPage.getByRole('heading', { name: NAME })).toBeVisible()
  })

  test('quando a moderadora edita o nome, a lista e o guia mostram o novo', async ({
    page,
    visitorPage,
  }) => {
    await page.goto('/administrator/places')
    await page.getByLabel('Buscar por nome ou descrição').fill(NAME)
    await page.getByRole('button', { name: 'Buscar', exact: true }).click()
    await page.getByRole('link', { name: `Editar ${NAME}` }).click()

    await expect(
      page.getByRole('heading', { level: 1, name: 'Editar lugar' }),
    ).toBeVisible()
    await page.getByLabel('Nome do lugar').fill(NEW_NAME)
    await page.getByRole('button', { name: 'Salvar alterações' }).click()
    await expect(page.getByText('Alterações salvas.')).toBeVisible()

    await visitorPage.goto('/guide?category=EAT')
    await expect(
      visitorPage.getByRole('heading', { name: NEW_NAME }),
    ).toBeVisible()
    await expect(
      visitorPage.getByRole('heading', { name: NAME, exact: true }),
    ).toHaveCount(0)
  })

  test('quando a moderadora arquiva o lugar, ele some do guia e vai para Arquivados', async ({
    page,
    visitorPage,
    expectHydrated,
  }) => {
    await page.goto('/administrator/places')
    await page.getByLabel('Buscar por nome ou descrição').fill(NEW_NAME)
    await page.getByRole('button', { name: 'Buscar', exact: true }).click()

    const row = page.getByRole('listitem').filter({ hasText: NEW_NAME })
    const archive = row.getByRole('button', { name: 'Arquivar', exact: true })
    await expectHydrated(archive)
    await archive.click()
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Arquivar lugar' })
      .click()

    await expect(
      page.getByText('Lugar arquivado. Ele saiu do guia.'),
    ).toBeVisible()

    await visitorPage.goto('/guide?category=EAT')
    await expect(
      visitorPage.getByRole('link', { name: 'Comer' }),
    ).toHaveAttribute('aria-current', 'page')
    await expect(
      visitorPage.getByRole('heading', { name: NEW_NAME }),
    ).toHaveCount(0)

    await page.getByRole('button', { name: 'Arquivados' }).click()
    await expect(
      page.getByRole('listitem').filter({ hasText: NEW_NAME }),
    ).toBeVisible()
  })

  test('quando a moderadora restaura o lugar, ele volta ao guia; arquivado de novo, o guia fica como estava', async ({
    page,
    visitorPage,
    expectHydrated,
  }) => {
    await page.goto('/administrator/places?archived=true')
    await page.getByLabel('Buscar por nome ou descrição').fill(NEW_NAME)
    await page.getByRole('button', { name: 'Buscar', exact: true }).click()
    const restore = page.getByRole('button', { name: `Restaurar ${NEW_NAME}` })
    await expectHydrated(restore)
    await restore.click()

    await expect(
      page.getByText('Lugar restaurado. Ele voltou ao guia.'),
    ).toBeVisible()

    await visitorPage.goto('/guide?category=EAT')
    await expect(
      visitorPage.getByRole('heading', { name: NEW_NAME }),
    ).toBeVisible()

    // Limpeza: arquiva de novo, para o guia semeado voltar a ter só os seus lugares.
    await page.goto('/administrator/places')
    await page.getByLabel('Buscar por nome ou descrição').fill(NEW_NAME)
    await page.getByRole('button', { name: 'Buscar', exact: true }).click()
    const again = page
      .getByRole('listitem')
      .filter({ hasText: NEW_NAME })
      .getByRole('button', { name: 'Arquivar', exact: true })
    await expectHydrated(again)
    await again.click()
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Arquivar lugar' })
      .click()
    await expect(
      page.getByText('Lugar arquivado. Ele saiu do guia.'),
    ).toBeVisible()
  })

  test('quando o moderador abre os arquivados, não vê "Excluir de vez"', async ({
    page,
  }) => {
    await page.goto('/administrator/places?archived=true')
    await page.getByLabel('Buscar por nome ou descrição').fill(NEW_NAME)
    await page.getByRole('button', { name: 'Buscar', exact: true }).click()

    await expect(
      page.getByRole('listitem').filter({ hasText: NEW_NAME }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Excluir de vez' }),
    ).toHaveCount(0)
  })
})

administratorTest.describe('exclusão definitiva de lugar', () => {
  administratorTest(
    'quando o administrador exclui de vez um lugar arquivado, ele deixa de existir',
    async ({ page, expectHydrated }) => {
      const name = `Lugar para excluir ${STAMP}`

      const created = await page.request.post(
        `${E2eEnv.apiUrl}/administrator/places`,
        {
          data: {
            category: 'SERVICE',
            name,
            description: 'Lugar de teste que o E2E apaga.',
            neighborhood: 'centro',
            address: 'Rua do Teste, 1',
            hours: 'Segunda a sexta, 8h às 17h',
          },
        },
      )
      expect(created.status()).toBe(201)
      const { id } = z.object({ id: z.string() }).parse(await created.json())

      const archived = await page.request.delete(
        `${E2eEnv.apiUrl}/administrator/places/${id}`,
      )
      expect(archived.status()).toBeLessThan(300)

      await page.goto('/administrator/places?archived=true')
      await page.getByLabel('Buscar por nome ou descrição').fill(name)
      await page.getByRole('button', { name: 'Buscar', exact: true }).click()

      const row = page.getByRole('listitem').filter({ hasText: name })
      const remove = row.getByRole('button', { name: 'Excluir de vez' })
      await expectHydrated(remove)
      await remove.click()
      await page
        .getByRole('alertdialog')
        .getByRole('button', { name: 'Excluir lugar de vez' })
        .click()

      await expect(page.getByText('Lugar excluído de vez.')).toBeVisible()
      const gone = await page.request.get(
        `${E2eEnv.apiUrl}/administrator/places/${id}`,
      )
      expect(gone.status()).toBe(404)
    },
  )
})
