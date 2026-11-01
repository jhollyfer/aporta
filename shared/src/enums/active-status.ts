/**
 * Whether the account can sign in. It is the active/inactive pair, and nothing in it is
 * specific to users.
 */
export const ACTIVE_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const

export type ActiveStatus = (typeof ACTIVE_STATUS)[keyof typeof ACTIVE_STATUS]

export const ACTIVE_STATUSES = Object.values(ACTIVE_STATUS)
