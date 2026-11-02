import { mkdir, writeFile } from 'node:fs/promises'

import { E2eAccount } from './support/account'
import { E2eSessionFiles } from './support/session-files'
import { test as setup } from '@playwright/test'

/**
 * O login do E2E, uma vez por execução (_doc-lib/playwright.md#docs/auth): cria a conta do
 * dono e entra, entra como a moderadora do seeder, e grava o estado do navegador de cada uma
 * em `playwright/.auth/`. Os projetos `mobile`, `tablet` e `desktop` dependem deste e leem os
 * arquivos em `support/test.ts`, em vez de cada worker entrar de novo: o limite de entrada é de
 * 5 por minuto por IP, e estourá-lo bloqueia por 10 minutos.
 */
setup('entra como dono e como equipe', async ({ playwright }) => {
  setup.setTimeout(180_000)

  const request = await playwright.request.newContext()

  try {
    const owner = await E2eAccount.session(request)
    const staff = await E2eAccount.staffSession(request)

    await mkdir(E2eSessionFiles.directory, { recursive: true })
    await writeFile(E2eSessionFiles.owner, JSON.stringify(owner))
    await writeFile(E2eSessionFiles.staff, JSON.stringify(staff))
    await E2eAccount.settle()
  } finally {
    await request.dispose()
  }
})
