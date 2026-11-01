import { z } from 'zod'

import { PLACE_CATEGORY } from '@aporta/shared'

/**
 * A aba do guia na URL. Aba em `useState` some no F5 e não se compartilha, e o
 * guia existe para mandar o link a quem acabou de chegar. Valor inválido cai na
 * primeira aba (`Comer`), a pergunta mais comum de quem desembarca.
 */
export const guideSearchSchema = z.object({
  category: z
    .enum(PLACE_CATEGORY)
    .default(PLACE_CATEGORY.EAT)
    .catch(PLACE_CATEGORY.EAT),
})

export type GuideSearch = z.infer<typeof guideSearchSchema>
