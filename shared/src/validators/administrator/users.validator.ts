import { ACTIVE_STATUSES } from '../../enums/active-status.js'
import { USER_ROLES } from '../../enums/user-role.js'
import { USER_SORT_COLUMNS } from '../../records/sort-columns.js'
import { Rule, z } from '../../validator.js'

/**
 * What `GET /administrator/users` accepts in the query: the accounts by role and status, with a
 * search over name and email. Archived accounts do not appear (no door archives an account yet),
 * so there is no `trashed` here.
 */
export const AdministratorUserPaginateValidator = z.object({
  ...Rule.paginationFields(),
  role: Rule.optional(z.enum(USER_ROLES)),
  status: Rule.optional(z.enum(ACTIVE_STATUSES)),
  ...Rule.sortFields(USER_SORT_COLUMNS),
})

/** Gives the account another role (`PUT /administrator/users/:id/role`). */
export const AdministratorUserChangeRoleValidator = z.object({
  role: z.enum(USER_ROLES),
})

/** Suspends (`INACTIVE`) or reactivates (`ACTIVE`) the account (`PUT /administrator/users/:id/status`). */
export const AdministratorUserChangeStatusValidator = z.object({
  status: z.enum(ACTIVE_STATUSES),
})

export type AdministratorUserPaginatePayload = z.infer<
  typeof AdministratorUserPaginateValidator
>
export type AdministratorUserChangeRolePayload = z.infer<
  typeof AdministratorUserChangeRoleValidator
>
export type AdministratorUserChangeStatusPayload = z.infer<
  typeof AdministratorUserChangeStatusValidator
>
