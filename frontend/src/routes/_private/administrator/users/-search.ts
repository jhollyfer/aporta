import { z } from 'zod'

import { ACTIVE_STATUS, USER_ROLE } from '@aporta/shared'
import type { AdministratorUserPaginatePayload } from '@aporta/shared'

/** Quantas contas por página. */
export const USERS_PER_PAGE = 20

/**
 * O estado da lista de contas na URL: o papel, o status (a conta suspensa é `INACTIVE`), a
 * página e o texto buscado (`q`, nome ou e-mail, que a API procura). Cada campo leva
 * `.catch(undefined)`: endereço colado errado volta ao padrão em vez de derrubar a página, e o
 * estado padrão (todos os papéis e status) não vai à URL.
 */
export const usersSearchSchema = z.object({
  role: z.enum(USER_ROLE).optional().catch(undefined),
  status: z.enum(ACTIVE_STATUS).optional().catch(undefined),
  page: z.number().int().min(1).optional().catch(undefined),
  q: z.string().trim().max(100).optional().catch(undefined),
})

export type UsersSearch = z.infer<typeof usersSearchSchema>

/** O search da URL em parâmetros da API; a ordem (mais novas primeiro) é a do servidor. */
export function toUsersParams(
  search: UsersSearch,
): AdministratorUserPaginatePayload {
  return {
    role: search.role,
    status: search.status,
    page: search.page,
    search: search.q,
    perPage: USERS_PER_PAGE,
  }
}
