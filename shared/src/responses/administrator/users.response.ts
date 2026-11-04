import { ACTIVE_STATUSES } from '../../enums/active-status.js'
import { USER_ROLES } from '../../enums/user-role.js'
import { z } from '../../validator.js'
import { ResponseRule } from '../envelope.js'

/**
 * An account as the administrator reads it, by allowlist: who the person is, what they may do and
 * whether they can sign in. No password, no hash, no session and no avatar: the panel needs none of
 * them to manage access. `verifiedAt` is the owner seal, shown so the screen tells the accounts apart.
 */
export const AdministratorUserShowResponse = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.string(),
  role: z.enum(USER_ROLES),
  status: z.enum(ACTIVE_STATUSES),
  verifiedAt: ResponseRule.datetime().nullable(),
  createdAt: ResponseRule.datetime(),
  updatedAt: ResponseRule.datetime().nullable(),
})

export type AdministratorUserShowResponse = z.infer<
  typeof AdministratorUserShowResponse
>

export const AdministratorUserPaginateResponse = ResponseRule.paginated(
  AdministratorUserShowResponse,
)

export type AdministratorUserPaginateResponse = z.infer<
  typeof AdministratorUserPaginateResponse
>
