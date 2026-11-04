import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { z } from 'zod'

import type { E2eSession } from './account'

const SessionFile = z.object({
  email: z.string(),
  storageState: z.object({
    cookies: z.array(
      z.object({
        name: z.string(),
        value: z.string(),
        domain: z.string(),
        path: z.string(),
        expires: z.number(),
        httpOnly: z.boolean(),
        secure: z.boolean(),
        sameSite: z.enum(['Strict', 'Lax', 'None']),
      }),
    ),
    origins: z.array(
      z.object({
        origin: z.string(),
        localStorage: z.array(
          z.object({ name: z.string(), value: z.string() }),
        ),
      }),
    ),
  }),
})

/**
 * Onde o projeto `setup` grava as sessões (`auth.setup.ts`). Fica em `playwright/.auth/`, que o
 * `.gitignore` já exclui: o arquivo tem o cookie de uma sessão viva.
 */
export class E2eSessionFiles {
  static readonly directory = path.resolve(
    import.meta.dirname,
    '../../playwright/.auth',
  )
  static readonly owner = path.join(E2eSessionFiles.directory, 'owner.json')
  static readonly staff = path.join(E2eSessionFiles.directory, 'staff.json')
  static readonly administrator = path.join(
    E2eSessionFiles.directory,
    'administrator.json',
  )

  static async read(file: string): Promise<E2eSession> {
    let text: string

    try {
      text = await readFile(file, 'utf8')
    } catch (cause) {
      throw new Error(
        `a sessão do E2E não está em ${file}: rode com o projeto "setup" (os projetos de viewport dependem dele)`,
        { cause },
      )
    }

    return SessionFile.parse(JSON.parse(text))
  }
}
