import { ACTIVE_STATUSES, USER_ROLES, USER_SORT_COLUMNS } from '@aporta/shared'

import { paginationFields, sortFields, vine } from '#core/validator'
import type { Infer } from '#core/validator'

/** The accounts list. The VineJS pair of the Zod `AdministratorUserPaginateValidator`. */
export const AdministratorUserPaginateValidator = vine.create({
  ...paginationFields(),
  role: vine.enum(USER_ROLES).optional(),
  status: vine.enum(ACTIVE_STATUSES).optional(),
  ...sortFields(USER_SORT_COLUMNS),
})

/** Changes the role. The VineJS pair of the Zod `AdministratorUserChangeRoleValidator`. */
export const AdministratorUserChangeRoleValidator = vine.create({
  role: vine.enum(USER_ROLES),
})

/** Suspends or reactivates. The VineJS pair of the Zod `AdministratorUserChangeStatusValidator`. */
export const AdministratorUserChangeStatusValidator = vine.create({
  status: vine.enum(ACTIVE_STATUSES),
})

export type AdministratorUserPaginatePayload = Infer<
  typeof AdministratorUserPaginateValidator
>
export type AdministratorUserChangeRolePayload = Infer<
  typeof AdministratorUserChangeRoleValidator
>
export type AdministratorUserChangeStatusPayload = Infer<
  typeof AdministratorUserChangeStatusValidator
>
